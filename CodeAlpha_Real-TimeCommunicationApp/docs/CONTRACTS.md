# RTC App — Shared Contracts (Single Source of Truth)

> **ALL backend/frontend code MUST follow these contracts exactly.**
> Stack: Next.js 16 App Router (REST API routes) + Socket.io mini-service (port 3003)
> + Prisma/SQLite. Auth: JWT (HS256) via `jsonwebtoken`, passwords via `bcryptjs`.

## JWT

- Secret: `process.env.JWT_SECRET` (identical value in root `.env` AND `mini-services/rtc-server/.env`)
- Expires: `process.env.JWT_EXPIRES_IN` (default `7d`)
- Payload: `{ sub: <user.id>, name, username }` — signed with HS256.
- REST auth: `rtc_token` httpOnly cookie (SameSite=Lax, path=/).
- Socket auth: client sends `auth: { token }` in the socket.io handshake; server verifies with `jwt.verify(token, JWT_SECRET)`.

## REST API (Next.js route handlers under src/app/api)

All JSON responses: `{ ok: true, data: ... }` or `{ ok: false, error: string }`.
Errors: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 500 server.
Input validation with **zod v4**. Use `import { db } from '@/lib/db'` for Prisma.

Helpers to be created in `src/lib/auth.ts`:
- `signToken(user)` → JWT string
- `setAuthCookie()` → uses `cookies()` from `next/headers` (**await cookies()** — async in Next 15+/16!)
- `clearAuthCookie()`
- `getAuthUser()` → reads cookie, verifies JWT, loads user from DB, returns user or null

Helpers in `src/lib/api.ts`: `ok(data)`, `fail(status, error)` response builders; `zodMessage(err)`.

Helpers in `src/lib/roomId.ts`: `generateRoomId()` — 10 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` using `crypto.randomBytes` (no confusing 0/O/1/I). Stored WITHOUT dashes in DB (strip dashes when looking up); UI formats as `XXX-XXX-XXXX`.

### Endpoints

| Method | Path | Auth | Body/Params | Success data |
|---|---|---|---|---|
| POST | /api/auth/register | – | `{ name, username, email, password }` | `{ user }` (sets cookie) |
| POST | /api/auth/login | – | `{ identifier, password }` (email OR username) | `{ user }` (sets cookie) |
| POST | /api/auth/logout | – | – | `{}` (clears cookie) |
| GET | /api/auth/me | cookie | – | `{ user }` or 401 |
| GET | /api/auth/token | cookie | – | `{ token }` — JWT for socket.io auth |
| PUT | /api/profile | cookie | `{ name?, bio? }` | `{ user }` |
| POST | /api/meetings | cookie | `{ title }` | `{ meeting: { roomId, title, ... } }` (also writes MeetingParticipant row) |
| GET | /api/meetings | cookie | – | `{ meetings: [{ roomId, title, createdAt, createdByName, role: 'host'\|'participant', lastJoinedAt }] }` (max 20, newest first) |
| GET | /api/meetings/[roomId] | cookie | – | `{ meeting: { roomId, title, createdAt, createdBy: { name }, participantCount } }` or 404. NOTE: `params` is a Promise in Next 16 → `{ params }: { params: Promise<{ roomId: string }> }`, strip dashes before lookup. Also upserts a MeetingParticipant row (join audit) for the current user. |
| POST | /api/files/upload | cookie | multipart form: `file`, `roomId` | `{ file: { id, filename, mimeType, size } }` |
| GET | /api/files/[id] | cookie | – | binary stream, `Content-Disposition: attachment` |

### Validation rules (zod)
- register: name 2–50 chars, username 3–20 `[a-zA-Z0-9_]+`, email valid, password ≥ 8 chars with at least one letter+digit. 409 if username/email taken (check separately for clear messages).
- login: identifier 3–100, password 1–100.
- profile: name 2–50 optional, bio 0–280 optional.
- meetings create: title 3–80.
- upload: `roomId` must exist in DB (404 otherwise). File size ≤ `parseInt(process.env.UPLOAD_MAX_MB||'15')` MB → 413. MIME allowlist → 415 (see allowlist below).
- filename: sanitize (basename only, strip path chars, cap 120 chars) → store on disk as `${cuid}${safeExt}` under `UPLOAD_DIR` (default `<projectRoot>/uploads`, mkdir recursive).

### MIME allowlist (upload)
`image/png, image/jpeg, image/gif, image/webp, application/pdf, text/plain, text/csv, text/markdown, application/json, application/zip, application/x-zip-compressed, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation, video/mp4, audio/mpeg, audio/wav`

### User JSON shape (never return password)
`{ id, name, username, email, bio, createdAt }`

## Socket.io mini-service (mini-services/rtc-server, port 3003)

- `new Server(httpServer, { path: '/', cors: { origin: true, credentials: true }, maxHttpBufferSize: 2e6 })`
  - **path MUST be `/`** (Caddy forwards via `?XTransformPort=3003`).
- Handshake auth middleware: `socket.handshake.auth.token` → `jwt.verify` with JWT_SECRET. On failure: `next(new Error('Unauthorized'))`.
- Allowed `data.roomId` format: `^[A-HJ-NP-Z2-9]{10}$` (after stripping dashes client-side).
- Store rooms in memory: `Map<roomId, { participants: Map<socketId, Participant>, chat: ChatMsg[], whiteboard: WBAction[] }>`.
- Participant: `{ socketId, userId, name, micOn: boolean, camOn: boolean, screenSharing: boolean, joinedAt }`.
- Chat history cap 200 msgs; whiteboard cap 1500 actions; whiteboard `clear` resets array.
- Simple rate limit: max 25 chat msgs / 10s per socket → else `room:error` event.

### Client → Server events (all validated, ack via callback `{ ok: boolean, error?: string, ...payload }`)

| Event | Payload | Behavior |
|---|---|---|
| `room:join` | `{ roomId, micOn, camOn }` | Validate roomId against **SQLite DB** (`SELECT id, title FROM Meeting WHERE roomId = ?` via `bun:sqlite`, read-only) → error if missing. Add to room, join socket.io room. **Ack**: `{ ok, self: socketId, room: { roomId, title }, participants: Participant[] (excluding self), chat: ChatMsg[], whiteboard: WBAction[] }`. Broadcast `participant:joined` (with Participant) to others. System chat message `"{name} joined"` is appended and broadcast as `chat:message`. |
| `room:leave` | – | Leave + broadcast `participant:left { socketId }`. Ack `{ ok }`. |
| `media:state` | `{ micOn?, camOn?, screenSharing? }` | Update participant, broadcast `participant:state { socketId, micOn, camOn, screenSharing }` to room. |
| `webrtc:offer` | `{ to, sdp }` | Relay as `webrtc:offer { from, sdp }` to socket `to` (must be in same room). |
| `webrtc:answer` | `{ to, sdp }` | Relay as `webrtc:answer { from, sdp }`. |
| `webrtc:ice-candidate` | `{ to, candidate }` | Relay as `webrtc:ice-candidate { from, candidate }`. |
| `chat:message` | `{ text }` (≤ 2000 chars, trimmed) | Append `{ id, userId, socketId, name, text, at }` to history, broadcast `chat:message` to room (including sender). |
| `whiteboard:action` | `{ action }` where action = `{ type: 'stroke'\|'shape'\|'erase'\|'clear', ...data }` (JSON ≤ 8KB) | Append to history, broadcast `whiteboard:action { from, action }` to others in room (NOT sender). |
| `file:shared` | `{ fileId, filename, mimeType, size }` (size ≤ 15MB, filename ≤ 200) | Append chat message `{ id, userId, socketId, name, text: 'shared a file', file: { fileId, filename, mimeType, size } }`, broadcast `chat:message` to room. |
| `room:info` | – | Ack `{ ok, room: { roomId, title }, participants: Participant[] }` or error. |

### Server → Client events

| Event | Payload |
|---|---|
| `participant:joined` | `Participant` |
| `participant:left` | `{ socketId, name }` (plus system chat message broadcast via `chat:message`) |
| `participant:state` | `{ socketId, micOn, camOn, screenSharing }` |
| `webrtc:offer` / `webrtc:answer` / `webrtc:ice-candidate` | `{ from, ... }` |
| `chat:message` | `ChatMsg` |
| `whiteboard:action` | `{ from, action }` |
| `room:error` | `{ code: 'ROOM_NOT_FOUND'\|'UNAUTHORIZED'\|'RATE_LIMITED'\|'INVALID_PAYLOAD'\|'SERVER_ERROR', message }` |

On `disconnect`: auto-leave room, broadcast `participant:left`, append system chat message.

### Port/env
- Listen on **3003**. Read `JWT_SECRET` from its own `.env` file in `mini-services/rtc-server/`.
- SQLite path: `/home/z/my-project/db/custom.db` opened **read-only** via `import { Database } from 'bun:sqlite'` (table `Meeting`, columns `roomId`, `title`).
- `package.json` script: `"dev": "bun --hot index.ts"`.

### Client socket connection (frontend reference)
```ts
import { io } from 'socket.io-client'
const socket = io('/?XTransformPort=3003', {
  transports: ['websocket', 'polling'],
  auth: { token },           // JWT from GET /api/auth/token
  reconnection: true,
  reconnectionAttempts: Infinity,
})
```
