// ---------------------------------------------------------------------------
// rtc-server shared TypeScript contracts.
// Mirrors docs/CONTRACTS.md — the single source of truth. NO `any` anywhere.
// ---------------------------------------------------------------------------

// --- Auth -------------------------------------------------------------------
/** Decoded JWT payload → attached to socket.data.user by the handshake middleware. */
export interface JwtUser {
  userId: string
  name: string
  username: string
}

/** Per-socket data attached by the auth middleware (undefined until verified). */
export interface SocketData {
  user?: JwtUser
}

/** socket.io inter-server events (unused). */
export type InterServerEvents = Record<string, never>

// --- Core room entities -------------------------------------------------------
export interface Participant {
  socketId: string
  userId: string
  name: string
  micOn: boolean
  camOn: boolean
  screenSharing: boolean
  joinedAt: string
}

export interface FileMeta {
  fileId: string
  filename: string
  mimeType: string
  size: number
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

export type WBActionType = 'stroke' | 'shape' | 'erase' | 'clear'

export interface WBAction {
  type: WBActionType
  [key: string]: unknown
}

export interface RoomState {
  participants: Map<string, Participant>
  chat: ChatMsg[]
  whiteboard: WBAction[]
}

// --- Acks ----------------------------------------------------------------------
export type Ack<T> = (res: T) => void

export interface SimpleAck {
  ok: boolean
  error?: string
}

export interface JoinAckData extends SimpleAck {
  self?: string
  room?: { roomId: string; title: string }
  /** participants EXCLUDING self */
  participants?: Participant[]
  chat?: ChatMsg[]
  whiteboard?: WBAction[]
}

export interface InfoAckData extends SimpleAck {
  room?: { roomId: string; title: string }
  /** participants INCLUDING self */
  participants?: Participant[]
}

// --- Client → Server payloads ---------------------------------------------------
export interface JoinPayload {
  roomId: string
  micOn?: boolean
  camOn?: boolean
}

export interface MediaStatePayload {
  micOn?: boolean
  camOn?: boolean
  screenSharing?: boolean
}

export interface ChatMessagePayload {
  text: string
}

export interface FileSharedPayload {
  fileId: string
  filename: string
  mimeType: string
  size: number
}

export interface WebRTCOfferPayload {
  to: string
  sdp: string
}

export interface WebRTCAnswerPayload {
  to: string
  sdp: string
}

export interface WebRTCIcePayload {
  to: string
  candidate: string | Record<string, unknown>
}

// --- Event maps (typed sockets) ---------------------------------------------------
export interface ClientToServerEvents {
  'room:join': (payload: JoinPayload, ack?: Ack<JoinAckData>) => void
  'room:leave': (ack?: Ack<SimpleAck>) => void
  'media:state': (payload: MediaStatePayload, ack?: Ack<SimpleAck>) => void
  'webrtc:offer': (payload: WebRTCOfferPayload) => void
  'webrtc:answer': (payload: WebRTCAnswerPayload) => void
  'webrtc:ice-candidate': (payload: WebRTCIcePayload) => void
  'chat:message': (payload: ChatMessagePayload, ack?: Ack<SimpleAck>) => void
  'whiteboard:action': (payload: { action: WBAction }, ack?: Ack<SimpleAck>) => void
  'file:shared': (payload: FileSharedPayload, ack?: Ack<SimpleAck>) => void
  'room:info': (ack?: Ack<InfoAckData>) => void
}

export interface ServerToClientEvents {
  'participant:joined': (participant: Participant) => void
  'participant:left': (payload: { socketId: string; name: string }) => void
  'participant:state': (payload: {
    socketId: string
    micOn: boolean
    camOn: boolean
    screenSharing: boolean
  }) => void
  'webrtc:offer': (payload: { from: string; sdp: string }) => void
  'webrtc:answer': (payload: { from: string; sdp: string }) => void
  'webrtc:ice-candidate': (payload: { from: string; candidate: string | Record<string, unknown> }) => void
  'chat:message': (msg: ChatMsg) => void
  'whiteboard:action': (payload: { from: string; action: WBAction }) => void
  'room:error': (payload: RoomErrorPayload) => void
}

export type RoomErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'INVALID_PAYLOAD'
  | 'SERVER_ERROR'

export interface RoomErrorPayload {
  code: RoomErrorCode
  message: string
}

// --- Validation constants (per docs/CONTRACTS.md) -----------------------------------
/** 10 chars, no confusing 0/O/1/I — client sends dashes-free roomId. */
export const ROOM_ID_RE = /^[A-HJ-NP-Z2-9]{10}$/
export const CHAT_TEXT_MAX = 2000
export const CHAT_HISTORY_CAP = 200
export const WHITEBOARD_CAP = 1500
export const WHITEBOARD_ACTION_MAX_BYTES = 8 * 1024
export const FILE_SIZE_MAX = 15 * 1024 * 1024
export const FILENAME_MAX = 200
export const FILE_ID_MAX = 64
export const CHAT_RATE_LIMIT = 25
export const CHAT_RATE_WINDOW_MS = 10_000

/** Same allowlist as the REST upload endpoint (docs/CONTRACTS.md). */
export const MIME_ALLOWLIST: readonly string[] = [
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
