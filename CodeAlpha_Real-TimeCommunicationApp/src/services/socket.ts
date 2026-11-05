'use client'

import { io, type Socket } from 'socket.io-client'
import { apiGet } from '@/lib/rtc/api-client'
import { useAppStore } from '@/store/useAppStore'
import type { ChatMsg, JoinAck, Participant, SimpleAck, WBIncomingAction } from '@/lib/rtc/types'
import { peerManager } from '@/services/webrtc'
import { toast } from '@/hooks/use-toast'

/**
 * Socket.io connection manager.
 *
 * The socket is created lazily when a meeting is joined and destroyed on
 * leave. All server → client event handlers live here and write into the
 * zustand store; media-specific events are forwarded to the PeerManager.
 */

let socket: Socket | null = null
let handlersBound = false
let tokenRefreshed = false

export function getSocket(): Socket | null {
  return socket
}

export async function ensureSocket(): Promise<Socket> {
  if (socket && socket.connected) return socket
  if (socket) {
    // existing socket is connecting/disconnected — reuse it (auth already set)
    return socket
  }

  const { token } = await apiGet<{ token: string }>('/api/auth/token')

  socket = io('/?XTransformPort=3003', {
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  })

  bindHandlers(socket)
  const store = useAppStore.getState()
  store.setSocketStatus('connecting')
  return socket
}

export function destroySocket() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
  handlersBound = false
  tokenRefreshed = false
  useAppStore.getState().setSocketStatus('idle')
}

/** Wait until the socket is connected (or throw after timeout). */
export function waitForConnect(s: Socket, timeoutMs = 12000): Promise<void> {
  if (s.connected) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('Could not reach the real-time server. Check your connection and retry.'))
    }, timeoutMs)
    const onConnect = () => {
      cleanup()
      resolve()
    }
    const onError = (err: Error) => {
      cleanup()
      reject(err)
    }
    const cleanup = () => {
      clearTimeout(timer)
      s.off('connect', onConnect)
      s.off('connect_error', onError)
    }
    s.on('connect', onConnect)
    s.on('connect_error', onError)
  })
}

/** Emit an event and await its ack. */
export function emitAck<T extends SimpleAck>(s: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve) => {
    s.timeout(10000).emit(event, payload, (err: unknown, res: T | undefined) => {
      if (err) {
        resolve({ ok: false, error: 'No response from server (timeout)' } as T)
      } else {
        resolve(res as T)
      }
    })
  })
}

function bindHandlers(s: Socket) {
  if (handlersBound) return
  handlersBound = true
  const store = useAppStore

  s.on('connect', () => {
    tokenRefreshed = false
    store.getState().setSocketStatus('connected')
    store.getState().setSocketError(null)

    // Reconnection while inside a meeting: re-run the join flow.
    const st = store.getState()
    if (st.view === 'meeting' && st.roomId && st.selfSocketId !== null) {
      void rejoinAfterReconnect()
    }
  })

  s.on('disconnect', (reason) => {
    store.getState().setSocketStatus('disconnected')
    if (reason === 'io server disconnect') {
      // server actively disconnected us (e.g. auth revoked) — try to get a fresh token
      void refreshAuthAndReconnect()
    }
  })

  s.on('connect_error', (err) => {
    const msg = err.message
    store.getState().setSocketStatus('error')
    if (msg === 'Unauthorized') {
      if (!tokenRefreshed) {
        tokenRefreshed = true
        void refreshAuthAndReconnect()
      } else {
        store.getState().setSocketError('Your session expired. Please sign in again.')
      }
    } else {
      store
        .getState()
        .setSocketError('Real-time server unreachable. Retrying automatically…')
    }
  })

  // ---- room events ----

  s.on('participant:joined', (p: Participant) => {
    store.getState().upsertParticipant({ ...p, connectionState: 'new' })
  })

  s.on('participant:left', ({ socketId, name }: { socketId: string; name?: string }) => {
    peerManager.handlePeerLeft(socketId)
    store.getState().removeParticipant(socketId)
    if (name) {
      toast({ title: `${name} left the meeting` })
    }
  })

  s.on('participant:state', (data: { socketId: string; micOn: boolean; camOn: boolean; screenSharing: boolean }) => {
    store.getState().updateParticipant(data.socketId, {
      micOn: data.micOn,
      camOn: data.camOn,
      screenSharing: data.screenSharing,
    })
  })

  s.on('room:error', (data: { code: string; message: string }) => {
    store.getState().setSocketError(data.message)
    toast({ title: 'Room error', description: data.message, variant: 'destructive' })
  })

  // ---- chat ----

  s.on('chat:message', (msg: ChatMsg) => {
    store.getState().addChat(msg)
  })

  // ---- whiteboard ----

  s.on('whiteboard:action', (data: WBIncomingAction) => {
    store.getState().pushWbAction(data.action)
  })
}

async function refreshAuthAndReconnect() {
  if (!socket) return
  try {
    const { token } = await apiGet<{ token: string }>('/api/auth/token')
    socket.auth = { token }
    socket.connect()
  } catch {
    const store = useAppStore.getState()
    store.setSocketError('Session expired — please sign in again.')
    store.setUser(null)
    store.setView('auth')
    leaveCleanup()
  }
}

/** Re-join the room after a socket reconnect (new socket id, fresh peer mesh). */
async function rejoinAfterReconnect() {
  const st = useAppStore.getState()
  const s = socket
  if (!s || !st.roomId) return

  peerManager.reset()
  st.setParticipants([])

  const ack = await emitAck<JoinAck>(s, 'room:join', {
    roomId: st.roomId,
    micOn: st.micOn,
    camOn: st.camOn,
  })
  if (!ack.ok || !ack.self || !ack.room) {
    useAppStore.getState().setSocketError(ack.error || 'Failed to rejoin the meeting.')
    return
  }
  const store = useAppStore.getState()
  store.setMeeting({ roomId: ack.room.roomId, title: ack.room.title, selfSocketId: ack.self })
  store.setParticipants(ack.participants ?? [])
  store.setChat(ack.chat ?? [])
  store.setWbActions(ack.whiteboard ?? [])
  peerManager.attach(s, ack.self)
  peerManager.setLocalStream(store.localStream)
  peerManager.connectToParticipants(ack.participants ?? [])
}

/** Internal cleanup used when the session is dead. */
function leaveCleanup() {
  peerManager.destroy()
  destroySocket()
  const store = useAppStore.getState()
  store.resetMeetingState()
  store.setLocalStream(null)
  store.setScreenStream(null)
  store.setView('lobby')
}
