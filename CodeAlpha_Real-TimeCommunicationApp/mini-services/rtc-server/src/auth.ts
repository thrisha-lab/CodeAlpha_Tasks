// Handshake JWT auth middleware — docs/CONTRACTS.md:
// `socket.handshake.auth.token` → jwt.verify with JWT_SECRET.
// On failure: next(new Error('Unauthorized')).
// On success: socket.data.user = { userId, name, username } from { sub, name, username }.
import jwt from 'jsonwebtoken'
import type { Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types'

export type AuthedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export function handshakeAuth(jwtSecret: string) {
  return (socket: AuthedSocket, next: (err?: Error) => void): void => {
    const auth = socket.handshake.auth as { token?: unknown } | undefined
    const token = auth?.token
    if (typeof token !== 'string' || token.length === 0) {
      next(new Error('Unauthorized'))
      return
    }
    try {
      const payload = jwt.verify(token, jwtSecret)
      if (payload === null || typeof payload === 'string') {
        next(new Error('Unauthorized'))
        return
      }
      const { sub, name, username } = payload as Record<string, unknown>
      if (typeof sub !== 'string' || typeof name !== 'string' || typeof username !== 'string') {
        next(new Error('Unauthorized'))
        return
      }
      socket.data.user = { userId: sub, name, username }
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  }
}
