// In-memory room state per docs/CONTRACTS.md:
// rooms: Map<roomId, { participants: Map<socketId, Participant>, chat: ChatMsg[], whiteboard: WBAction[] }>
// Caps: chat 200 msgs, whiteboard 1500 actions; whiteboard `clear` resets the array.
import {
  CHAT_HISTORY_CAP,
  WHITEBOARD_CAP,
  type ChatMsg,
  type Participant,
  type RoomState,
  type WBAction,
} from './types'

/** socket.io room name for a given business roomId. */
export function roomName(roomId: string): string {
  return `room:${roomId}`
}

export const rooms = new Map<string, RoomState>()
/** socketId → roomId (a socket joins at most one meeting room at a time). */
export const socketRoom = new Map<string, string>()

let seq = 0

/** Collision-safe id for chat messages / system events. */
export function genId(): string {
  seq = (seq + 1) % Number.MAX_SAFE_INTEGER
  return `${Date.now().toString(36)}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function makeSystemMsg(text: string): ChatMsg {
  return {
    id: genId(),
    userId: 'system',
    socketId: 'system',
    name: 'System',
    text,
    at: new Date().toISOString(),
  }
}

export function getRoom(roomId: string): RoomState | null {
  return rooms.get(roomId) ?? null
}

export function ensureRoom(roomId: string): RoomState {
  let room = rooms.get(roomId)
  if (!room) {
    room = { participants: new Map(), chat: [], whiteboard: [] }
    rooms.set(roomId, room)
  }
  return room
}

export function roomIdForSocket(socketId: string): string | null {
  return socketRoom.get(socketId) ?? null
}

export function joinRoom(roomId: string, participant: Participant): RoomState {
  const room = ensureRoom(roomId)
  room.participants.set(participant.socketId, participant)
  socketRoom.set(participant.socketId, roomId)
  return room
}

/** Removes the socket from the room. Deletes the room entirely when it becomes empty. */
export function leaveRoom(roomId: string, socketId: string): Participant | null {
  socketRoom.delete(socketId)
  const room = rooms.get(roomId)
  if (!room) return null
  const participant = room.participants.get(socketId) ?? null
  room.participants.delete(socketId)
  if (room.participants.size === 0) rooms.delete(roomId)
  return participant
}

export function appendChat(roomId: string, msg: ChatMsg): void {
  const room = rooms.get(roomId)
  if (!room) return
  room.chat.push(msg)
  if (room.chat.length > CHAT_HISTORY_CAP) {
    room.chat.splice(0, room.chat.length - CHAT_HISTORY_CAP)
  }
}

export function appendWhiteboard(roomId: string, action: WBAction): void {
  const room = rooms.get(roomId)
  if (!room) return
  if (action.type === 'clear') {
    room.whiteboard = []
    return
  }
  room.whiteboard.push(action)
  if (room.whiteboard.length > WHITEBOARD_CAP) {
    room.whiteboard.splice(0, room.whiteboard.length - WHITEBOARD_CAP)
  }
}
