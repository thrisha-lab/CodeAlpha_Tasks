// ---------------------------------------------------------------------------
// rtc-server — Socket.io mini-service for the RTC app.
// WebRTC signaling (offer/answer/ICE relay), chat, whiteboard relay, presence.
// Contracts: docs/CONTRACTS.md (single source of truth).
// Bootstrap pattern: examples/websocket/server.ts (path '/', port 3003).
// ---------------------------------------------------------------------------
import { createServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { handshakeAuth, type AuthedSocket } from './src/auth'
import { roomExists } from './src/db'
import {
  appendChat,
  appendWhiteboard,
  genId,
  getRoom,
  joinRoom,
  leaveRoom,
  makeSystemMsg,
  roomIdForSocket,
  roomName,
} from './src/rooms'
import {
  CHAT_RATE_LIMIT,
  CHAT_RATE_WINDOW_MS,
  CHAT_TEXT_MAX,
  FILE_ID_MAX,
  FILE_SIZE_MAX,
  FILENAME_MAX,
  MIME_ALLOWLIST,
  ROOM_ID_RE,
  WHITEBOARD_ACTION_MAX_BYTES,
  type Ack,
  type ChatMsg,
  type ClientToServerEvents,
  type FileMeta,
  type InfoAckData,
  type InterServerEvents,
  type JoinAckData,
  type Participant,
  type RoomErrorCode,
  type ServerToClientEvents,
  type SimpleAck,
  type SocketData,
  type WBAction,
  type WBActionType,
} from './src/types'

// --- env (Bun auto-loads .env from this directory) ---------------------------
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error(
    '[rtc-server] FATAL: JWT_SECRET is not set. Copy it exactly from the root .env into mini-services/rtc-server/.env',
  )
  process.exit(1)
}
const PORT = Number(process.env.SOCKET_PORT) || 3003

// --- bootstrap (pattern from examples/websocket/server.ts) --------------------
const httpServer = createServer()

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  // DO NOT change the path — the Caddy gateway forwards via ?XTransformPort=3003
  path: '/',
  cors: { origin: true, credentials: true },
  maxHttpBufferSize: 2e6,
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.use(handshakeAuth(JWT_SECRET))

// --- helpers -------------------------------------------------------------------
type ClientSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

const isStr = (v: unknown): v is string => typeof v === 'string'
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

function emitRoomError(socket: ClientSocket, code: RoomErrorCode, message: string): void {
  socket.emit('room:error', { code, message })
}

/** Emit room:error + a failing ack in one call. */
function deny(
  socket: ClientSocket,
  ack: Ack<SimpleAck> | undefined,
  error: string,
  code: RoomErrorCode,
  message: string,
): void {
  emitRoomError(socket, code, message)
  ack?.({ ok: false, error })
}

function serverError(socket: ClientSocket, ack: Ack<SimpleAck> | undefined, where: string, err: unknown): void {
  console.error(`[rtc-server] ${where} error (socket ${socket.id}):`, err)
  deny(socket, ack, 'SERVER_ERROR', 'SERVER_ERROR', 'Internal server error')
}

/** Returns the roomId if this socket is a participant of an in-memory room, else null. */
function currentRoom(socket: ClientSocket): string | null {
  const roomId = roomIdForSocket(socket.id)
  if (!roomId) return null
  const room = getRoom(roomId)
  if (!room || !room.participants.has(socket.id)) return null
  return roomId
}

// --- chat rate limiter: max 25 msgs / 10s per socket ----------------------------
const chatHits = new Map<string, number[]>()

function chatRateLimited(socketId: string): boolean {
  const now = Date.now()
  const hits = (chatHits.get(socketId) ?? []).filter((t) => now - t < CHAT_RATE_WINDOW_MS)
  if (hits.length >= CHAT_RATE_LIMIT) {
    chatHits.set(socketId, hits)
    return true
  }
  hits.push(now)
  chatHits.set(socketId, hits)
  return false
}

// --- connection -------------------------------------------------------------------
io.on('connection', (socket: ClientSocket) => {
  const user = socket.data.user
  console.log(`[rtc-server] connect: ${socket.id} (user: ${user ? user.username : 'unknown'})`)

  // ------------------------------------------------------------------ room:join
  socket.on('room:join', async (payload, ack) => {
    try {
      const u = socket.data.user
      if (!u) {
        deny(socket, ack, 'UNAUTHORIZED', 'UNAUTHORIZED', 'Missing authenticated user')
        return
      }
      const o: unknown = payload
      if (typeof o !== 'object' || o === null) {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', 'room:join requires a payload object')
        return
      }
      const rec = o as Record<string, unknown>
      if (rec.micOn !== undefined && !isBool(rec.micOn)) {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', 'micOn must be a boolean')
        return
      }
      if (rec.camOn !== undefined && !isBool(rec.camOn)) {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', 'camOn must be a boolean')
        return
      }
      const roomId = rec.roomId
      if (!isStr(roomId) || !ROOM_ID_RE.test(roomId)) {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', 'roomId must match ^[A-HJ-NP-Z2-9]{10}$')
        return
      }
      if (roomIdForSocket(socket.id)) {
        // Prevent duplicate join by the same socket.
        deny(socket, ack, 'ALREADY_IN_ROOM', 'INVALID_PAYLOAD', 'This socket is already in a room')
        return
      }
      const meeting = roomExists(roomId)
      if (!meeting) {
        deny(socket, ack, 'ROOM_NOT_FOUND', 'ROOM_NOT_FOUND', `Meeting ${roomId} does not exist`)
        return
      }
      const participant: Participant = {
        socketId: socket.id,
        userId: u.userId,
        name: u.name,
        micOn: isBool(rec.micOn) ? rec.micOn : true,
        camOn: isBool(rec.camOn) ? rec.camOn : true,
        screenSharing: false,
        joinedAt: new Date().toISOString(),
      }
      const room = joinRoom(roomId, participant)
      await socket.join(roomName(roomId))

      const others = [...room.participants.values()].filter((p) => p.socketId !== socket.id)
      ack?.({
        ok: true,
        self: socket.id,
        room: { roomId, title: meeting.title },
        participants: others,
        chat: [...room.chat],
        whiteboard: [...room.whiteboard],
      })
      // Notify existing members only.
      socket.to(roomName(roomId)).emit('participant:joined', participant)
      // System chat message: appended to history and broadcast to the whole room (incl. joiner).
      const sysMsg = makeSystemMsg(`${u.name} joined the meeting`)
      appendChat(roomId, sysMsg)
      io.to(roomName(roomId)).emit('chat:message', sysMsg)
      console.log(`[rtc-server] ${u.name} (${socket.id}) joined room ${roomId} (${others.length} others)`)
    } catch (err) {
      serverError(socket, ack, 'room:join', err)
    }
  })

  // ------------------------------------------------------------------ room:leave
  // NOTE: tolerant signature — clients may emit with or without a payload,
  // the ack callback is detected by type (socket.io passes it last).
  socket.on('room:leave', async (...args: unknown[]) => {
    const ack = args.find((a): a is (res: unknown) => void => typeof a === 'function')
    try {
      const roomId = roomIdForSocket(socket.id)
      if (!roomId) {
        ack?.({ ok: false, error: 'NOT_IN_ROOM' })
        return
      }
      const participant = leaveRoom(roomId, socket.id)
      void socket.leave(roomName(roomId))
      if (participant) {
        io.to(roomName(roomId)).emit('participant:left', {
          socketId: participant.socketId,
          name: participant.name,
        })
        const sysMsg = makeSystemMsg(`${participant.name} left the meeting`)
        appendChat(roomId, sysMsg)
        io.to(roomName(roomId)).emit('chat:message', sysMsg)
        console.log(`[rtc-server] ${participant.name} (${participant.socketId}) left room ${roomId}`)
      }
      ack?.({ ok: true })
    } catch (err) {
      serverError(socket, ack ?? null, 'room:leave', err)
    }
  })

  // ------------------------------------------------------------------ media:state
  socket.on('media:state', (payload, ack) => {
    try {
      const roomId = currentRoom(socket)
      if (!roomId) {
        deny(socket, ack, 'NOT_IN_ROOM', 'INVALID_PAYLOAD', 'You are not in a room')
        return
      }
      const o: unknown = payload
      if (typeof o !== 'object' || o === null) {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', 'media:state requires a payload object')
        return
      }
      const rec = o as Record<string, unknown>
      for (const key of ['micOn', 'camOn', 'screenSharing'] as const) {
        const v: unknown = rec[key]
        if (v !== undefined && !isBool(v)) {
          deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', `${key} must be a boolean`)
          return
        }
      }
      if (rec.micOn === undefined && rec.camOn === undefined && rec.screenSharing === undefined) {
        deny(
          socket,
          ack,
          'INVALID_PAYLOAD',
          'INVALID_PAYLOAD',
          'at least one of micOn, camOn, screenSharing is required',
        )
        return
      }
      const participant = getRoom(roomId)?.participants.get(socket.id)
      if (!participant) {
        deny(socket, ack, 'NOT_IN_ROOM', 'INVALID_PAYLOAD', 'You are not in a room')
        return
      }
      if (isBool(rec.micOn)) participant.micOn = rec.micOn
      if (isBool(rec.camOn)) participant.camOn = rec.camOn
      if (isBool(rec.screenSharing)) participant.screenSharing = rec.screenSharing
      io.to(roomName(roomId)).emit('participant:state', {
        socketId: participant.socketId,
        micOn: participant.micOn,
        camOn: participant.camOn,
        screenSharing: participant.screenSharing,
      })
      ack?.({ ok: true })
    } catch (err) {
      serverError(socket, ack, 'media:state', err)
    }
  })

  // ------------------------------------------------------------------ webrtc relay
  // Verify the target socket is in the SAME room, then relay as { from, ... }.
  // Invalid targets are silently dropped.
  socket.on('webrtc:offer', (payload) => {
    try {
      const o: unknown = payload
      if (typeof o !== 'object' || o === null) return
      const rec = o as Record<string, unknown>
      const to = rec.to
      const sdp = rec.sdp
      if (!isStr(to) || to === socket.id) return
      const roomId = roomIdForSocket(socket.id)
      if (!roomId || roomIdForSocket(to) !== roomId) return
      if (!getRoom(roomId)?.participants.has(to)) return
      if (!isStr(sdp)) return
      io.to(to).emit('webrtc:offer', { from: socket.id, sdp })
    } catch (err) {
      console.error('[rtc-server] webrtc:offer relay error:', err)
    }
  })

  socket.on('webrtc:answer', (payload) => {
    try {
      const o: unknown = payload
      if (typeof o !== 'object' || o === null) return
      const rec = o as Record<string, unknown>
      const to = rec.to
      const sdp = rec.sdp
      if (!isStr(to) || to === socket.id) return
      const roomId = roomIdForSocket(socket.id)
      if (!roomId || roomIdForSocket(to) !== roomId) return
      if (!getRoom(roomId)?.participants.has(to)) return
      if (!isStr(sdp)) return
      io.to(to).emit('webrtc:answer', { from: socket.id, sdp })
    } catch (err) {
      console.error('[rtc-server] webrtc:answer relay error:', err)
    }
  })

  socket.on('webrtc:ice-candidate', (payload) => {
    try {
      const o: unknown = payload
      if (typeof o !== 'object' || o === null) return
      const rec = o as Record<string, unknown>
      const to = rec.to
      const candidate: unknown = rec.candidate
      if (!isStr(to) || to === socket.id) return
      const roomId = roomIdForSocket(socket.id)
      if (!roomId || roomIdForSocket(to) !== roomId) return
      if (!getRoom(roomId)?.participants.has(to)) return
      const valid = isStr(candidate) || (typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate))
      if (!valid) return
      io.to(to).emit('webrtc:ice-candidate', {
        from: socket.id,
        candidate: candidate as string | Record<string, unknown>,
      })
    } catch (err) {
      console.error('[rtc-server] webrtc:ice-candidate relay error:', err)
    }
  })

  // ------------------------------------------------------------------ chat:message
  socket.on('chat:message', (payload, ack) => {
    try {
      const roomId = currentRoom(socket)
      const u = socket.data.user
      if (!roomId || !u) {
        deny(socket, ack, 'NOT_IN_ROOM', 'INVALID_PAYLOAD', 'You are not in a room')
        return
      }
      const o: unknown = payload
      if (typeof o !== 'object' || o === null || !isStr((o as Record<string, unknown>).text)) {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', 'chat:message requires { text: string }')
        return
      }
      const text = ((o as Record<string, unknown>).text as string).trim()
      if (text.length === 0 || text.length > CHAT_TEXT_MAX) {
        deny(
          socket,
          ack,
          'INVALID_PAYLOAD',
          'INVALID_PAYLOAD',
          `text must be 1–${CHAT_TEXT_MAX} characters after trim`,
        )
        return
      }
      if (chatRateLimited(socket.id)) {
        emitRoomError(socket, 'RATE_LIMITED', 'Too many messages — max 25 per 10s')
        ack?.({ ok: false, error: 'RATE_LIMITED' })
        return
      }
      const msg: ChatMsg = {
        id: genId(),
        userId: u.userId,
        socketId: socket.id,
        name: u.name,
        text,
        at: new Date().toISOString(),
      }
      appendChat(roomId, msg)
      // Broadcast to the whole room INCLUDING sender.
      io.to(roomName(roomId)).emit('chat:message', msg)
      ack?.({ ok: true })
    } catch (err) {
      serverError(socket, ack, 'chat:message', err)
    }
  })

  // ------------------------------------------------------------------ whiteboard:action
  socket.on('whiteboard:action', (payload, ack) => {
    try {
      const roomId = currentRoom(socket)
      if (!roomId) {
        deny(socket, ack, 'NOT_IN_ROOM', 'INVALID_PAYLOAD', 'You are not in a room')
        return
      }
      const o: unknown = payload
      const action: unknown = typeof o === 'object' && o !== null ? (o as Record<string, unknown>).action : undefined
      if (typeof action !== 'object' || action === null || Array.isArray(action)) {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', 'whiteboard:action requires { action: object }')
        return
      }
      const rec = action as Record<string, unknown>
      const type: unknown = rec.type
      const WB_TYPES: readonly WBActionType[] = ['stroke', 'shape', 'erase', 'clear']
      if (!isStr(type) || !(WB_TYPES as readonly string[]).includes(type)) {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', 'action.type must be stroke|shape|erase|clear')
        return
      }
      let size = 0
      try {
        size = Buffer.byteLength(JSON.stringify(action))
      } catch {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', 'action is not JSON-serializable')
        return
      }
      if (size > WHITEBOARD_ACTION_MAX_BYTES) {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', 'action exceeds 8KB JSON limit')
        return
      }
      const wbAction = action as WBAction
      appendWhiteboard(roomId, wbAction) // `clear` resets the history array
      // Broadcast to others in the room (NOT sender).
      socket.to(roomName(roomId)).emit('whiteboard:action', { from: socket.id, action: wbAction })
      ack?.({ ok: true })
    } catch (err) {
      serverError(socket, ack, 'whiteboard:action', err)
    }
  })

  // ------------------------------------------------------------------ file:shared
  socket.on('file:shared', (payload, ack) => {
    try {
      const roomId = currentRoom(socket)
      const u = socket.data.user
      if (!roomId || !u) {
        deny(socket, ack, 'NOT_IN_ROOM', 'INVALID_PAYLOAD', 'You are not in a room')
        return
      }
      const o: unknown = payload
      if (typeof o !== 'object' || o === null) {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', 'file:shared requires a payload object')
        return
      }
      const rec = o as Record<string, unknown>
      const fileId: unknown = rec.fileId
      const filename: unknown = rec.filename
      const mimeType: unknown = rec.mimeType
      const size: unknown = rec.size
      if (!isStr(fileId) || fileId.length === 0 || fileId.length > FILE_ID_MAX) {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', `fileId must be a string of 1–${FILE_ID_MAX} chars`)
        return
      }
      if (!isStr(filename) || filename.trim().length === 0 || filename.length > FILENAME_MAX) {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', `filename must be 1–${FILENAME_MAX} chars`)
        return
      }
      if (!isStr(mimeType) || !MIME_ALLOWLIST.includes(mimeType)) {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', 'mimeType is not in the allowed allowlist')
        return
      }
      if (typeof size !== 'number' || !Number.isInteger(size) || size <= 0 || size > FILE_SIZE_MAX) {
        deny(socket, ack, 'INVALID_PAYLOAD', 'INVALID_PAYLOAD', `size must be an integer ≤ ${FILE_SIZE_MAX} bytes`)
        return
      }
      const file: FileMeta = { fileId, filename, mimeType, size }
      const msg: ChatMsg = {
        id: genId(),
        userId: u.userId,
        socketId: socket.id,
        name: u.name,
        text: 'shared a file',
        at: new Date().toISOString(),
        file,
      }
      appendChat(roomId, msg)
      io.to(roomName(roomId)).emit('chat:message', msg)
      ack?.({ ok: true })
    } catch (err) {
      serverError(socket, ack, 'file:shared', err)
    }
  })

  // ------------------------------------------------------------------ room:info
  // Tolerant signature (same rationale as room:leave).
  socket.on('room:info', (...args: unknown[]) => {
    const ack = args.find((a): a is (res: unknown) => void => typeof a === 'function')
    try {
      const roomId = roomIdForSocket(socket.id)
      const room = roomId ? getRoom(roomId) : null
      if (!roomId || !room) {
        ack?.({ ok: false, error: 'NOT_IN_ROOM' })
        return
      }
      const meeting = roomExists(roomId)
      ack?.({
        ok: true,
        room: { roomId, title: meeting?.title ?? 'Unknown meeting' },
        participants: [...room.participants.values()],
      })
    } catch (err) {
      serverError(socket, ack ?? null, 'room:info', err)
    }
  })

  // ------------------------------------------------------------------ disconnect
  socket.on('disconnect', (reason) => {
    chatHits.delete(socket.id)
    const roomId = roomIdForSocket(socket.id)
    if (!roomId) {
      console.log(`[rtc-server] disconnect: ${socket.id} (${reason}, not in a room)`)
      return
    }
    const participant = leaveRoom(roomId, socket.id)
    if (participant) {
      io.to(roomName(roomId)).emit('participant:left', {
        socketId: participant.socketId,
        name: participant.name,
      })
      const sysMsg = makeSystemMsg(`${participant.name} left the meeting`)
      appendChat(roomId, sysMsg)
      io.to(roomName(roomId)).emit('chat:message', sysMsg)
    }
    console.log(`[rtc-server] disconnect: ${socket.id} (${reason}) — auto-left room ${roomId}`)
  })

  socket.on('error', (err) => {
    console.error(`[rtc-server] socket error (${socket.id}):`, err)
  })
})

// --- listen ----------------------------------------------------------------------
httpServer.listen(PORT, () => {
  console.log(`[rtc-server] Socket.io signaling server listening on port ${PORT} (path '/')`)
})

// --- graceful shutdown --------------------------------------------------------------
process.on('SIGTERM', () => {
  console.log('[rtc-server] SIGTERM received — shutting down...')
  io.close()
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('[rtc-server] SIGINT received — shutting down...')
  io.close()
  httpServer.close(() => process.exit(0))
})
