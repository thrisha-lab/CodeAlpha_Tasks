'use client'

import { create } from 'zustand'
import type {
  ChatMsg,
  MeetingHistoryItem,
  MeetingInfo,
  Participant,
  SocketStatus,
  User,
  WBAction,
  MediaErrorKind,
} from '@/lib/rtc/types'

export type View = 'boot' | 'auth' | 'lobby' | 'prejoin' | 'meeting'
export type ActivePanel = 'chat' | 'participants' | null

interface AppState {
  // ---- boot / auth ----
  view: View
  user: User | null
  meetingHistory: MeetingHistoryItem[]
  historyLoading: boolean

  // ---- prejoin ----
  pendingRoomId: string | null
  pendingRoomTitle: string
  isHost: boolean
  localStream: MediaStream | null
  micOn: boolean
  camOn: boolean
  mediaError: { kind: MediaErrorKind; detail: string } | null
  acquiringMedia: boolean

  // ---- meeting / connection ----
  socketStatus: SocketStatus
  socketError: string | null
  roomId: string | null
  roomTitle: string
  selfSocketId: string | null
  participants: Record<string, Participant>
  screenStream: MediaStream | null
  screenSharing: boolean
  joining: boolean

  // ---- panels / chat ----
  activePanel: ActivePanel
  chat: ChatMsg[]
  unreadChat: number

  // ---- whiteboard ----
  whiteboardOpen: boolean
  wbActions: WBAction[]

  // ---- actions ----
  setView: (v: View) => void
  setUser: (u: User | null) => void
  setHistory: (h: MeetingHistoryItem[], loading?: boolean) => void
  setHistoryLoading: (b: boolean) => void

  setPendingRoom: (roomId: string | null, title: string, isHost: boolean) => void
  setLocalStream: (s: MediaStream | null) => void
  setMicOn: (b: boolean) => void
  setCamOn: (b: boolean) => void
  setMediaError: (e: { kind: MediaErrorKind; detail: string } | null) => void
  setAcquiringMedia: (b: boolean) => void

  setSocketStatus: (s: SocketStatus) => void
  setSocketError: (e: string | null) => void
  setMeeting: (info: { roomId: string; title: string; selfSocketId: string }) => void
  setParticipants: (list: Participant[]) => void
  upsertParticipant: (p: Participant) => void
  removeParticipant: (socketId: string) => void
  updateParticipant: (socketId: string, patch: Partial<Participant>) => void
  setScreenStream: (s: MediaStream | null) => void
  setScreenSharing: (b: boolean) => void
  setJoining: (b: boolean) => void

  setActivePanel: (p: ActivePanel) => void
  setChat: (msgs: ChatMsg[]) => void
  addChat: (msg: ChatMsg) => void
  setWhiteboardOpen: (b: boolean) => void
  setWbActions: (a: WBAction[]) => void
  pushWbAction: (a: WBAction) => void

  resetMeetingState: () => void
}

const initialMeeting = {
  socketStatus: 'idle' as SocketStatus,
  socketError: null as string | null,
  roomId: null as string | null,
  roomTitle: '',
  selfSocketId: null as string | null,
  participants: {} as Record<string, Participant>,
  screenStream: null as MediaStream | null,
  screenSharing: false,
  joining: false,
  activePanel: null as ActivePanel,
  chat: [] as ChatMsg[],
  unreadChat: 0,
  whiteboardOpen: false,
  wbActions: [] as WBAction[],
}

export const useAppStore = create<AppState>((set) => ({
  view: 'boot',
  user: null,
  meetingHistory: [],
  historyLoading: false,

  pendingRoomId: null,
  pendingRoomTitle: '',
  isHost: false,
  localStream: null,
  micOn: true,
  camOn: true,
  mediaError: null,
  acquiringMedia: false,

  ...initialMeeting,

  setView: (view) => set({ view }),
  setUser: (user) => set({ user }),
  setHistory: (meetingHistory, loading) =>
    set((s) => ({ meetingHistory, historyLoading: loading ?? s.historyLoading })),
  setHistoryLoading: (historyLoading) => set({ historyLoading }),

  setPendingRoom: (pendingRoomId, pendingRoomTitle, isHost) =>
    set({ pendingRoomId, pendingRoomTitle, isHost }),
  setLocalStream: (localStream) => set({ localStream }),
  setMicOn: (micOn) => set({ micOn }),
  setCamOn: (camOn) => set({ camOn }),
  setMediaError: (mediaError) => set({ mediaError }),
  setAcquiringMedia: (acquiringMedia) => set({ acquiringMedia }),

  setSocketStatus: (socketStatus) => set({ socketStatus }),
  setSocketError: (socketError) => set({ socketError }),
  setMeeting: ({ roomId, title, selfSocketId }) =>
    set({ roomId, roomTitle: title, selfSocketId }),
  setParticipants: (list) =>
    set({ participants: Object.fromEntries(list.map((p) => [p.socketId, p])) }),
  upsertParticipant: (p) => set((s) => ({ participants: { ...s.participants, [p.socketId]: p } })),
  removeParticipant: (socketId) =>
    set((s) => {
      const participants = { ...s.participants }
      delete participants[socketId]
      return { participants }
    }),
  updateParticipant: (socketId, patch) =>
    set((s) => {
      const cur = s.participants[socketId]
      if (!cur) return {}
      return { participants: { ...s.participants, [socketId]: { ...cur, ...patch } } }
    }),
  setScreenStream: (screenStream) => set({ screenStream }),
  setScreenSharing: (screenSharing) => set({ screenSharing }),
  setJoining: (joining) => set({ joining }),

  setActivePanel: (activePanel) =>
    set((s) => ({
      activePanel,
      unreadChat: activePanel === 'chat' ? 0 : s.unreadChat,
    })),
  setChat: (chat) => set({ chat }),
  addChat: (msg) =>
    set((s) => ({
      chat: [...s.chat, msg].slice(-400),
      unreadChat: s.activePanel === 'chat' ? s.unreadChat : s.unreadChat + 1,
    })),
  setWhiteboardOpen: (whiteboardOpen) => set({ whiteboardOpen }),
  setWbActions: (wbActions) => set({ wbActions }),
  pushWbAction: (a) => set((s) => ({ wbActions: [...s.wbActions, a].slice(-1500) })),

  resetMeetingState: () => set(initialMeeting),
}))

/** Convenience selector: participants including connection quality order. */
export function selectParticipantList(state: AppState): Participant[] {
  return Object.values(state.participants)
}

export function selectMeetingInfo(state: AppState): MeetingInfo | null {
  if (!state.roomId) return null
  return {
    roomId: state.roomId,
    title: state.roomTitle,
    createdAt: new Date().toISOString(),
    createdBy: { name: '' },
    participantCount: Object.keys(state.participants).length + 1,
  }
}
