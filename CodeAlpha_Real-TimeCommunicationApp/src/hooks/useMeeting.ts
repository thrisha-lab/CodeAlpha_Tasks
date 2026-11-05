'use client'

import { useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/rtc/api-client'
import { useAppStore } from '@/store/useAppStore'
import type { JoinAck, MeetingHistoryItem, MeetingInfo, SimpleAck, User } from '@/lib/rtc/types'
import { emitAck, destroySocket, ensureSocket, getSocket, waitForConnect } from '@/services/socket'
import { peerManager } from '@/services/webrtc'
import { toast } from '@/hooks/use-toast'

/**
 * High-level meeting lifecycle orchestration used by the UI:
 *   createMeeting → PreJoin → enterMeeting ⇄ leaveMeeting
 */

export function useMeeting() {
  const refreshHistory = useCallback(async () => {
    const store = useAppStore.getState()
    store.setHistoryLoading(true)
    try {
      const { meetings } = await apiGet<{ meetings: MeetingHistoryItem[] }>('/api/meetings')
      useAppStore.getState().setHistory(meetings, false)
    } catch {
      useAppStore.getState().setHistory([], false)
    }
  }, [])

  /** Create a new room and go to the pre-join screen. */
  const createMeeting = useCallback(
    async (title: string) => {
      const store = useAppStore.getState()
      try {
        const { meeting } = await apiPost<{ meeting: { roomId: string; title: string } }>(
          '/api/meetings',
          { title },
        )
        store.setPendingRoom(meeting.roomId, meeting.title, true)
        store.setView('prejoin')
        void refreshHistory()
      } catch (err) {
        toast({
          title: 'Could not create meeting',
          description: (err as Error).message,
          variant: 'destructive',
        })
      }
    },
    [refreshHistory],
  )

  /** Validate + look up an existing room and go to the pre-join screen. */
  const joinByRoomId = useCallback(async (rawId: string) => {
    const roomId = rawId.replace(/-/g, '').toUpperCase().trim()
    if (!/^[A-HJ-NP-Z2-9]{10}$/.test(roomId)) {
      toast({
        title: 'Invalid meeting ID',
        description: 'A meeting ID looks like ABC-DEF-GHIJ (10 characters).',
        variant: 'destructive',
      })
      return
    }
    const store = useAppStore.getState()
    try {
      const { meeting } = await apiGet<{ meeting: MeetingInfo }>(
        `/api/meetings/${encodeURIComponent(roomId)}`,
      )
      store.setPendingRoom(meeting.roomId, meeting.title, false)
      store.setView('prejoin')
    } catch (err) {
      toast({
        title: 'Meeting not found',
        description: (err as Error).message,
        variant: 'destructive',
      })
    }
  }, [])

  /**
   * The "Join now" button on PreJoin.
   * 1. connect socket (JWT auth)  2. room:join  3. start the peer mesh.
   */
  const enterMeeting = useCallback(async () => {
    const store = useAppStore.getState()
    const roomId = store.pendingRoomId
    if (!roomId) return
    store.setJoining(true)

    try {
      const socket = await ensureSocket()
      await waitForConnect(socket)

      const ack = await emitAck<JoinAck>(socket, 'room:join', {
        roomId,
        micOn: store.micOn,
        camOn: store.camOn,
      })
      if (!ack.ok || !ack.self || !ack.room) {
        throw new Error(ack.error || 'The room rejected the join request.')
      }

      useAppStore.getState().setMeeting({
        roomId: ack.room.roomId,
        title: ack.room.title,
        selfSocketId: ack.self,
      })
      useAppStore.getState().setParticipants(ack.participants ?? [])
      useAppStore.getState().setChat(ack.chat ?? [])
      useAppStore.getState().setWbActions(ack.whiteboard ?? [])
      useAppStore.getState().setView('meeting')

      peerManager.attach(socket, ack.self)
      peerManager.setLocalStream(useAppStore.getState().localStream)
      peerManager.connectToParticipants(ack.participants ?? [])

      void refreshHistory()
    } catch (err) {
      toast({
        title: 'Failed to join meeting',
        description: (err as Error).message,
        variant: 'destructive',
      })
      destroySocket()
      useAppStore.getState().setView('lobby')
    } finally {
      useAppStore.getState().setJoining(false)
    }
  }, [refreshHistory])

  /** Leave the meeting (or abandon the pre-join screen) and return to the lobby. */
  const leaveMeeting = useCallback(async () => {
    const s = getSocket()
    if (s && useAppStore.getState().roomId) {
      try {
        await emitAck<SimpleAck>(s, 'room:leave', {})
      } catch {
        /* best effort */
      }
    }
    peerManager.destroy()
    peerManager.releaseLocalMedia()
    destroySocket()
    const st = useAppStore.getState()
    st.resetMeetingState()
    st.setView('lobby')
    void refreshHistory()
  }, [refreshHistory])

  /** Boot: restore the session from the httpOnly cookie. */
  const boot = useCallback(async () => {
    const store = useAppStore.getState()
    try {
      const { user } = await apiGet<{ user: User }>('/api/auth/me')
      store.setUser(user)
      store.setView('lobby')
      void refreshHistory()
    } catch {
      store.setUser(null)
      store.setView('auth')
    }
  }, [refreshHistory])

  return { createMeeting, joinByRoomId, enterMeeting, leaveMeeting, refreshHistory, boot }
}
