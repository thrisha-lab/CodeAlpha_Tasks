// Shared frontend types — mirrors docs/CONTRACTS.md

export interface User {
  id: string
  name: string
  username: string
  email: string
  bio: string | null
  createdAt: string
}

export interface MeetingHistoryItem {
  roomId: string
  title: string
  createdAt: string
  createdByName: string
  role: 'host' | 'participant'
  lastJoinedAt: string
}

export interface MeetingInfo {
  roomId: string
  title: string
  createdAt: string
  createdBy: { name: string }
  participantCount: number
}

export interface FileMeta {
  fileId: string
  filename: string
  mimeType: string
  size: number
}

export interface Participant {
  socketId: string
  userId: string
  name: string
  micOn: boolean
  camOn: boolean
  screenSharing: boolean
  joinedAt: string
  // client-only fields (not sent over the wire)
  remoteStream?: MediaStream
  connectionState?: RTCPeerConnectionState | 'new'
}

export interface ChatMsg {
  id: string
  userId: string
  socketId: string
  name: string
  text: string
  at: string
  file?: FileMeta
}

export type WBShapeKind = 'rect' | 'ellipse' | 'line'

export type WBAction =
  | { type: 'stroke'; points: [number, number][]; color: string; width: number }
  | { type: 'erase'; points: [number, number][]; width: number }
  | { type: 'shape'; shape: WBShapeKind; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { type: 'clear' }

export interface WBIncomingAction {
  from: string
  action: WBAction
}

// ---- socket.io acks ----

export interface JoinAck {
  ok: boolean
  error?: string
  self?: string
  room?: { roomId: string; title: string }
  participants?: Participant[]
  chat?: ChatMsg[]
  whiteboard?: WBAction[]
}

export interface SimpleAck {
  ok: boolean
  error?: string
}

export type SocketStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

export type MediaErrorKind =
  | 'camera-denied'
  | 'mic-denied'
  | 'not-found'
  | 'in-use'
  | 'screen-denied'
  | 'unknown'

export const STUN_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

// Keep in sync with the REST MIME allowlist (docs/CONTRACTS.md)
export const FILE_MIME_ALLOWLIST = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4',
  'audio/mpeg',
  'audio/wav',
]

export const MAX_FILE_MB = 15
