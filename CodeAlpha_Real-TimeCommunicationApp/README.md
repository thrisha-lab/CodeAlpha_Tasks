# CodeAlpha Connect — Real-Time Communication App

A full-stack **real-time communication and collaboration platform**: authenticated users create/join meeting rooms and communicate via **multi-user WebRTC video/audio, screen sharing, real-time chat, file sharing, and a collaborative whiteboard**.

> Built for the **CodeAlpha Full Stack Development internship**.
> This is a genuinely functional real-time application — real `getUserMedia` streams, real `RTCPeerConnection`s, real-time signaling. **No fake video, no simulated participants, no placeholder boxes.**

---

## 1. Feature Summary

| Area | What's implemented |
|---|---|
| **Authentication** | Register, login (email **or** username), logout, JWT (HS256), bcrypt password hashing, httpOnly cookie sessions, protected REST APIs, protected socket handshake, editable user profile |
| **Meeting rooms** | Create room (secure 10-char ID), join by ID, shareable invite link (`/?room=ID`), copy ID, leave, live participant list, join/leave audit stored in DB |
| **Multi-user video** | Real WebRTC mesh: camera + microphone via `getUserMedia`, per-participant tiles, mute/unmute, camera on/off, participant state broadcast, join/leave handling |
| **WebRTC signaling** | Socket.io relay for `join / user-joined / offer / answer / ICE candidates / user-left`, ICE restart on failure, socket auto-reconnect + automatic room re-join |
| **Screen sharing** | `getDisplayMedia` + `RTCRtpSender.replaceTrack` (no renegotiation), start/stop, browser "Stop sharing" button handled, spotlight layout, "Presenting" badges, broadcast notifications |
| **Meeting controls** | Mic, camera, screen share, whiteboard toggle, chat toggle (+ unread badge), participant list, leave, per-tile fullscreen |
| **Real-time chat** | Instant send/receive, username + timestamps, session chat history (replayed to late joiners), system join/leave messages, unread counter |
| **File sharing** | Upload via authenticated REST (multipart) → metadata broadcast via Socket.io → authenticated download. Size limit (15 MB), MIME allowlist, sanitized filenames, upload progress, file cards with download |
| **Collaborative whiteboard** | Canvas API: pencil, eraser, rectangle, ellipse, line, 7 colors, stroke width, clear board, multi-user real-time sync, full board history replay for late joiners, resolution-independent (normalized coordinates) |
| **UI/UX** | Professional conferencing UI (dark meeting room), responsive (mobile → desktop), connection status (Live/Connecting/Offline + per-tile connecting/failed overlays), loading states, error toasts, permission-denied guidance, join-without-media fallback |

---

## 2. Architecture

```
┌──────────────────────────── Browser (SPA) ────────────────────────────┐
│  Next.js 16 + React 19 + TypeScript + Tailwind 4 + shadcn/ui          │
│  Zustand store ── views: Auth → Lobby → PreJoin → MeetingRoom         │
│                                                                      │
│  services/socket.ts          services/webrtc.ts (PeerManager)         │
│   • socket.io client          • RTCPeerConnection per peer (mesh)     │
│   • event handlers            • offer/answer/ICE via socket relay     │
│                               • replaceTrack screen share             │
└───────┬──────────────────────────────┬───────────────────────────────┘
        │ HTTPS (REST, JWT cookie)     │ ①signaling via Socket.io (WSS)
        │                              │ ②media: P2P via WebRTC (DTLS/SRTP)
        ▼                              ▼
┌──────────────────────┐      ┌─────────────────────────────┐
│ Next.js API routes   │      │ Socket.io signaling service │
│ (Node runtime)       │      │ (mini-services/rtc-server)  │
│  /api/auth/*         │      │  port 3003, path '/'        │
│  /api/meetings/*     │      │  rooms, chat, whiteboard,   │
│  /api/files/*        │      │  webrtc relay, JWT-authed   │
│  zod validation      │      │  bun:sqlite room check      │
└──────────┬───────────┘      └──────────────┬──────────────┘
           │ Prisma ORM                      │ read-only room lookup
           ▼                                 ▼
        ┌─────────────── SQLite (db/custom.db) ───────────────┐
        │  User · Meeting · MeetingParticipant · SharedFile   │
        └──────────────────────────────────────────────────────┘
```

**Key rule honored:** media streams **never** pass through any server. Servers only carry signaling (small JSON) and chat/whiteboard data.

### Stack mapping (sandbox note)

The assignment described Express + MongoDB. This environment standardizes on **Next.js 16 (App Router) + Prisma/SQLite + a dedicated Socket.io mini-service** — a 1:1 architectural mapping:

| Classic MERN piece | This project |
|---|---|
| Express controllers/routes | Next.js route handlers in `src/app/api/**` (same REST contract) |
| Mongoose models | Prisma models in `prisma/schema.prisma` (same fields) |
| Socket.io inside Express | Standalone Socket.io service (`mini-services/rtc-server`, port 3003) behind the gateway |
| JWT middleware | `src/lib/auth.ts` (cookies) + socket handshake middleware |

All architectural principles (layered API, JWT auth, server-side validation, in-memory room state, P2P media) are identical.

---

## 3. WebRTC Architecture (explained)

### Topology: full mesh
Every participant maintains one `RTCPeerConnection` **per remote participant** (N peers → N−1 connections each). Mesh is appropriate at internship scale (2–6 participants); SFU media servers are the production upgrade path for larger rooms.

### Signaling flow
1. Client connects to the Socket.io service with `auth: { token }` → server verifies the JWT **during the handshake** (unauthorized sockets are rejected).
2. `room:join` → the server validates the room against the **database**, adds the socket to the room, and acks with the participant list + chat + whiteboard history.
3. **The newcomer initiates an offer to every existing peer** (deterministic, avoids offer glare by construction; a polite rollback path guards reconnect races).
4. `webrtc:offer` → `webrtc:answer` → trickle `webrtc:ice-candidate` — all relayed **through** the server but addressed peer-to-peer.
5. `connectionstatechange` is surfaced per tile: `Connecting…`, `Reconnecting…`, `Connection failed` (with automatic `restartIce()`).

### STUN / ICE / TURN
- **ICE candidates** are the possible network addresses (host/srflx/relay) a peer can be reached on.
- **STUN** (`stun:stun.l.google.com:19302`, dev-grade public servers) lets a peer discover its public reflexive address so peers behind home routers (cone/port-restricted NAT) can connect directly.
- **TURN is NOT included.** Production deployments need a TURN server (e.g. **coturn**, Cloudflare Calls, Twilio NTS) for symmetric NATs and strict corporate firewalls — there, direct P2P is impossible and media must relay through TURN (~bandwidth cost). Add: `{ urls: 'turn:host:3478', username, credential }` to `STUN_SERVERS` in `src/lib/rtc/types.ts`.

### Renegotiation-free design
- Audio/video transceivers are created `sendrecv` up-front.
- **Mute/camera off** = `track.enabled = false` (no renegotiation).
- **Screen share / late camera enable** = `RTCRtpSender.replaceTrack(...)` (no renegotiation).
- Joining without media still creates `sendrecv` transceivers with null tracks, so devices can be enabled later with zero renegotiation.

---

## 4. File-sharing architecture (and its limits)

**Chosen design: REST upload + socket notification + REST download.**

1. Sender picks a file → client-side pre-validation (size ≤ 15 MB, MIME allowlist).
2. `POST /api/files/upload` (multipart, JWT cookie) → server re-validates (zod + size + allowlist), sanitizes the filename (basename, no path traversal, ≤ 120 chars), stores bytes **on disk** (`uploads/<cuid>.<ext>`, mode 0600), metadata in SQLite. The file is **never** stored in the database.
3. Sender emits `file:shared` (metadata only) → server validates and relays → everyone gets a chat file card.
4. Recipients click Download → `GET /api/files/:id` (JWT cookie) → streamed with `Content-Disposition: attachment`.

**Why not through Socket.io?** Blasting megabytes through the signaling channel blocks event loops, defeats the purpose of a lightweight relay, and has no resumability. The chosen design keeps real-time channels small and gives us HTTP semantics (progress, auth, ranges-ready).

**Limits / considerations (documented honestly):**
- Hard cap **15 MB** and an allowlist of 20 MIME types — configurable via env.
- Files are stored **unencrypted on local disk** — fine for a dev/demo deployment; production would use S3-style object storage with signed URLs, AV scanning, and per-room ACLs.
- Download authorization is "authenticated user + unguessable file ID" — a stricter build would verify room membership server-side (requires shared membership state between services).
- Disk cleanup of orphaned uploads is manual (no TTL job).

---

## 5. Security

**Implemented**
- bcrypt (cost 10) password hashing; passwords never returned by any API.
- JWT (HS256, 7 d) in an **httpOnly, SameSite=Lax** cookie (`secure` in production); socket handshake authenticated with the same secret.
- **Server-side validation everywhere**: zod on every REST route; type/length/rate-limit validation on every socket event (chat ≤ 2000 chars, ≤ 25 msgs/10 s, whiteboard actions ≤ 8 KB, room-ID regex).
- Room authorization: joining requires a valid JWT **and** a room that exists in the DB; WebRTC relays and chat/whiteboard events only work for sockets inside the room.
- Generic error messages (no stack traces/secret leakage), SQL injection safe (Prisma + prepared statements), no secrets in code (`.env`, `.env.example` provided).
- Client + server double validation for uploads (defense in depth).

**Honest limitations (student/dev-grade)**
- `GET /api/auth/token` exposes the JWT to JS so the socket can present it — this weakens the XSS protection an httpOnly-only cookie would give.
- Socket CORS currently reflects any origin (`origin: true`) to work behind the dev gateway — lock to your domain in production.
- No CSRF tokens (SameSite=Lax mitigates the common cases; add CSRF protection for production forms).
- Rate limiting is per-socket, in-memory — a real deployment needs Redis-backed limits.
- JWTs cannot be revoked before expiry (add a denylist/rotation for production).
- HTTP is used locally; deploy behind TLS.

---

## 6. Project Structure

```
├── docs/CONTRACTS.md            # REST + Socket.io contract (single source of truth)
├── prisma/schema.prisma         # User, Meeting, MeetingParticipant, SharedFile
├── db/custom.db                 # SQLite database file
├── uploads/                     # shared file binaries (never committed)
├── .env.example                 # all environment variables documented
├── Caddyfile                    # gateway: port 81 → Next :3000, ?XTransformPort → :3003
├── mini-services/rtc-server/    # Socket.io signaling service (Bun, port 3003)
│   ├── index.ts                 #   bootstrap + all event handlers
│   ├── src/{auth,db,rooms,types}.ts
│   └── .env                     #   same JWT_SECRET as root
└── src/
    ├── app/page.tsx             # SPA root (single route; client-side views)
    ├── app/api/                 # REST: auth/*, profile, meetings/*, files/*
    ├── lib/rtc/                 # types, api-client, format helpers
    ├── lib/{auth,api,roomId,validators,db}.ts
    ├── store/useAppStore.ts     # zustand global state
    ├── services/socket.ts       # socket.io lifecycle + handlers
    ├── services/webrtc.ts       # PeerManager (mesh, replaceTrack, ICE)
    ├── hooks/useMeeting.ts      # create/join/enter/leave orchestration
    └── components/rtc/          # AuthScreen, Lobby, PreJoin, MeetingRoom,
                                 # VideoTile, ControlsBar, ChatPanel,
                                 # ParticipantsPanel, Whiteboard, ProfileDialog
```

---

## 7. Setup & Run (local development)

**Prereqs:** Node 20+/Bun, no external DB needed (SQLite file).

```bash
# 1. install dependencies
bun install                       # (or: npm install)

# 2. environment
cp .env.example .env              # then set JWT_SECRET (openssl rand -hex 32)

# 3. signaling service env (same JWT_SECRET!)
mkdir -p mini-services/rtc-server
printf 'JWT_SECRET=<same-secret>\nSOCKET_PORT=3003\n' > mini-services/rtc-server/.env

# 4. database
bun run db:push                   # creates db/custom.db from the schema

# 5. start both servers
bun run dev                       # Next.js on :3000 (terminal 1)
cd mini-services/rtc-server && bun run dev   # signaling on :3003 (terminal 2)
```

Open the app (or the preview panel). Register → Create meeting → share the room ID or invite link → second user/browser joins.

**Environment variables** (see `.env.example`): `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `UPLOAD_MAX_MB`, `UPLOAD_DIR` (optional), `SOCKET_PORT`.

---

## 8. Testing Checklist (manual)

**Authentication**
- [x] Register (valid / duplicate username / duplicate email / weak password → 409/400)
- [x] Login by email **and** by username; wrong password → 401 (generic message)
- [x] Logout clears the session; `/api/auth/me` → 401 after logout
- [x] Session survives page reload (httpOnly cookie)

**Meetings**
- [x] Create room → unique 10-char ID; appears in Recent meetings (role "Host")
- [x] Join by ID (with dashes or without); invalid format → client error; unknown ID → "Meeting not found"
- [x] Second participant joins → both see count 2 + "joined" system message
- [x] Leave → other side sees "left" + count updates

**WebRTC (verified in this build)**
- [x] Signaling offer/answer/ICE exchange between two sockets (peer connections reach `connected` — tiles stop showing "Connecting…")
- [x] Graceful path with camera/mic absent → join-without-media, tile shows avatar
- [ ] Camera/mic/video tiles with real devices — **needs a real browser with a camera** (headless CI cannot grant permissions); use the checklist above in Chrome/Edge
- [x] Mute/unmute + camera off/on broadcast participant state (icon updates on remote tiles)

**Screen share**
- [ ] Start/stop with real display — requires a desktop browser permission prompt (verified logic: `replaceTrack`, `ended` listener, spotlight layout)

**Chat / Whiteboard / Files** (all verified with two tabs)
- [x] Send/receive instantly both directions; history replayed to late joiners
- [x] Draw in tab A → appears in tab B (pixel-identical); clear syncs; pencil/eraser/shapes/colors/width work
- [x] Upload valid file → card on both sides → download intact; oversized → rejected; disallowed type → rejected

**Security**
- [x] Unauthenticated API call → 401; unauthenticated socket → handshake rejected
- [x] Invalid room ID / unknown room → rejected with clear error
- [x] Socket events from non-members have no effect (server-side room check)

---

## 9. Production Deployment Considerations

- **TLS everywhere** (HTTPS + WSS); set cookie `secure: true`.
- Add a **TURN server** (coturn) for NAT-restricted users — see §3.
- Lock **CORS** to your real origin; add CSRF protection and Redis-backed rate limiting.
- Replace in-memory room state with Redis pub/sub if you run multiple signaling instances; add a Socket.io **Redis adapter** for cross-instance rooms.
- Move uploads to object storage (S3/R2) with signed URLs + AV scanning + lifecycle rules.
- Add monitoring (peer-connection failure rates), structured logs, and DB migrations (`prisma migrate`) instead of `db push`.
- Frontend `next build` + `next start`; signaling service under a process manager (systemd/pm2) — here `bun run dev` (hot reload) is dev-only.

## 10. Known Limitations

1. Mesh topology → practical ceiling ~6–8 video participants (bandwidth grows ×N).
2. Screen sharing and camera are mutually exclusive tracks (screen replaces camera on remote view — standard replaceTrack approach; camera tile remains visible locally).
3. Chat/whiteboard history is session-scoped (in-memory, per design) and lost on server restart.
4. Whiteboard has no undo/redo; coordinates are normalized so rendering is resolution-independent but freehand quality varies slightly across devices.
5. No mobile-native experience for `getDisplayMedia` (browser limitation) — mobile can *view* shared screens.
6. No TURN server bundled → users behind strict symmetric NATs may fail to connect P2P (dev STUN only).
7. JWT not revocable before expiry; token endpoint exposes the token to JS (see §5).

---

*Verified end-to-end in this environment with agent-browser: register/login/logout, create/join/leave, two-socket WebRTC connection state, two-way chat, cross-tab whiteboard sync (pixel-identical), file upload→broadcast→download, invalid-room rejection, 401 on unauthenticated APIs, mobile viewport layout, and sticky footer behavior.*
