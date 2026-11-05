# CodeAlpha — Real-Time Communication App

## Worklog (append-only, shared by all agents)

---
Task ID: 1
Agent: lead (Z.ai Code orchestrator)
Task: Phase 1 — architecture, environment setup, database schema, shared contracts

Work Log:
- Explored project: Next.js 16 + App Router, Tailwind 4, shadcn/ui (New York), Prisma/SQLite at db/custom.db, dev server already running on port 3000 (tee dev.log).
- Read examples/websocket/*: confirmed gateway pattern — server `new Server(httpServer, { path: '/' })` on port 3003; client `io('/?XTransformPort=3003', { transports: ['websocket','polling'] })`.
- Installed root deps: socket.io-client, jsonwebtoken@9, bcryptjs@3, @types/jsonwebtoken.
- Rewrote prisma/schema.prisma: User, Meeting (unique short roomId), MeetingParticipant (join/leave audit), SharedFile (file metadata; binaries on disk in uploads/). Ran `bun run db:push` — DB in sync.
- Generated JWT_SECRET (openssl rand -hex 32) into root .env with JWT_EXPIRES_IN=7d, UPLOAD_MAX_MB=15, SOCKET_PORT=3003.
- Wrote docs/CONTRACTS.md (REST endpoints + socket.io events + validation rules) — the single source of truth for Tasks 2-a, 2-b and all frontend work.
- Wrote .env.example. Created docs/, uploads/, mini-services/ directories.

Stage Summary:
- Architecture mapping: Express controllers → Next.js route handlers (src/app/api/**); Mongoose models → Prisma models; Socket.io signaling → dedicated mini-service at mini-services/rtc-server (port 3003, bun --hot). WebRTC mesh topology, Google public STUN, media strictly P2P.
- JWT shared between Next app and socket service for unified auth.
- Next agents: read docs/CONTRACTS.md before coding; append your section here via Bash `cat >>` (do not overwrite).
---
Task ID: 2-a
Agent: full-stack-developer
Task: REST API backend (auth, profile, meetings, files)

Work Log:
- Read worklog.md, docs/CONTRACTS.md, prisma/schema.prisma, src/lib/db.ts; installed @paralleldrive/cuid2 (for on-disk filenames).
- Wrote lib helpers: src/lib/roomId.ts (generateRoomId via crypto.randomBytes over 32-char unambiguous alphabet — no modulo bias since 256%32==0; stripRoomIdDashes; formatRoomId XXX-XXX-XXXX), src/lib/api.ts (ok/fail envelopes {ok:true,data}/{ok:false,error}, zodMessage first-issue extraction, readJson), src/lib/auth.ts (signToken HS256 {sub,name,username} with JWT_EXPIRES_IN; setAuthCookie/clearAuthCookie via AWAIT cookies() — Next 16 async; cookie rtc_token httpOnly SameSite=lax path=/ maxAge 7d secure=prod; getAuthUser verifies JWT then loads password-free user from DB), src/lib/validators.ts (zod v4 schemas: register [name 2–50, username 3–20 ^[a-zA-Z0-9_]+$, email trim/lower+pipe, password ≥8 + letter+digit], login, profile, createMeeting, uploadSchema, MIME_ALLOWLIST set, maxUploadBytes from UPLOAD_MAX_MB default 15).
- Wrote routes (all runtime nodejs, try/catch → generic 500, no `any`): auth/register (precise 409 per username/email, P2002 race guard, bcrypt cost 10), auth/login (username OR lowercased email, single generic 401 to prevent enumeration), auth/logout (clears cookie, idempotent), auth/me (401 if unauthenticated), auth/token ({token} for socket.io handshake), profile PUT (partial {name?,bio?}, 400 when empty patch), meetings POST (unique roomId with P2002 retry loop ×5, creates MeetingParticipant row for creator), meetings GET history (participants take 40 desc → dedupe by meetingId keeping first as lastJoinedAt → role host/participant → cap 20), meetings/[roomId] GET (awaits Promise params, strips dashes, 404, upserts audit row only when none with leftAt==null, participantCount counted after insert), files/upload POST (formData; size>max→413; MIME not in allowlist→415; roomId→404; basename+charset sanitization cap 120; stored as uploads/<cuid><safeExt> mode 0600), files/[id] GET (404 when row or disk file missing; Content-Type from stored mimeType; Content-Disposition attachment with ASCII fallback + RFC 5987 filename*; Cache-Control private, no-store).
- Smoke-tested everything via curl against running dev server; fixed one tsc strict error (meetings history array typed MeetingHistoryEntry[] instead of never[]).
- Cleanup: deleted smoke rows from MeetingParticipant/Meeting/SharedFile/User(%smoke%) via bun:sqlite; removed test binaries from uploads/; DB + uploads left clean.

Stage Summary:
- All 11 endpoints implemented exactly per docs/CONTRACTS.md and verified: register 200(+Set-Cookie)/409/400, login 200/401, logout 200, me 200/401, token 200, profile 200/400/401, meetings POST 200/400 + GET 200 (host/participant roles, lastJoinedAt), meetings/[roomId] 200/404 (dashed IDs accepted; audit upsert, no dup rows; participantCount 2 after 2nd user, stable on re-GET), files/upload 200/413/415/401/404, files/[id] 200 + byte-identical roundtrip/404/401.
- Never returns password; JSON envelopes {ok:true,data}/{ok:false,error}; success = 200 everywhere.
- eslint clean; tsc clean for src/** (pre-existing errors only in examples/, skills/ — untouched).
- Frontend note: GET /api/auth/token → {token} must be passed as io('/?XTransformPort=3003', { auth: { token } }); upload needs multipart FormData field names "file" and "roomId" (roomId accepts dashed or raw).
---
Task ID: 2-b
Agent: general-purpose
Task: Socket.io mini-service (WebRTC signaling, chat, whiteboard relay)

Work Log:
- Read worklog.md, docs/CONTRACTS.md, examples/websocket/server.ts, root .env (JWT_SECRET), prisma/schema.prisma; verified db/custom.db Meeting table (columns roomId/title) via bun:sqlite.
- Created mini-services/rtc-server/: package.json (name "rtc-server", dev: "bun --hot index.ts", deps socket.io@^4.8.1 + jsonwebtoken@^9, devDep @types/jsonwebtoken) and .env (JWT_SECRET copied exactly from root .env, SOCKET_PORT=3003). `bun install` OK (socket.io 4.8.3, jsonwebtoken 9.0.3).
- Wrote src/types.ts (all interfaces/event maps/constants — zero `any`), src/auth.ts (handshake middleware: jwt.verify on socket.handshake.auth.token, next(new Error('Unauthorized')) on failure, attaches socket.data.user {userId,name,username} from {sub,name,username}), src/db.ts (READ-ONLY bun:sqlite open of /home/z/my-project/db/custom.db with try/catch, roomExists() = SELECT id,title FROM Meeting WHERE roomId=?), src/rooms.ts (rooms Map, socketRoom index, chat cap 200 / whiteboard cap 1500, clear resets array, empty-room cleanup, system msg helper, genId), index.ts (Server with path '/', cors origin:true+credentials, maxHttpBufferSize 2e6, pingTimeout 60000, pingInterval 25000, port 3003 from env; fatal exit if JWT_SECRET missing; all 10 client→server handlers with full payload validation, acks, rate limit 25 chat/10s → room:error RATE_LIMITED to sender only, webrtc relay {from,...} with same-room target check + silent drop, file:shared metadata relay with contract allowlist/limits, disconnect auto-leave, graceful SIGTERM/SIGINT).
- Boot verification: started in background (nohup bun run dev > server.log) — log shows listening on 3003, no errors; curl '/?EIO=4&transport=polling' returns engine.io open payload starting with `0{` (pingInterval 25000, pingTimeout 60000, maxPayload 2e6).
- Signaling smoke test (inline `bun -e` only, no test files left): inserted temp User+Meeting rows (roomId SMKRM2XK99 — note: task-brief 'SMOKEROOM01' violates the contract regex ^[A-HJ-NP-Z2-9]{10}$, so a compliant id was used), signed 4 JWTs with the same JWT_SECRET, ran a 2-client+ script asserting 59 checks: auth (bad/missing token → connect_error 'Unauthorized'), join ack shape {ok,self,room,participants,chat,whiteboard}, participant:joined/left + system chat, duplicate-join prevention, chat relay incl. sender + >2000/blank rejection, whiteboard relay excluding sender + bad type/>8KB rejection, webrtc offer/answer/ICE relay + ghost-target silent drop, media:state broadcast + validation, file:shared metadata + mime/size/filename validation, room:info, 26th-chat RATE_LIMITED to sender only, history persistence across rejoin, empty-room cleanup, whiteboard clear reset. ALL 59 PASSED.
- Cleanup: DELETE'd smoke Meeting/User rows (verified 0 remaining), removed /tmp tokens. Service left RUNNING in background.

Stage Summary:
- mini-services/rtc-server is a standalone Bun + Socket.io v4.8 service on :3003, path '/', JWT handshake auth shared with the Next app, read-only SQLite room lookup, full CONTRACTS.md event implementation (ack + room:error codes ROOM_NOT_FOUND|UNAUTHORIZED|RATE_LIMITED|INVALID_PAYLOAD|SERVER_ERROR).
- In-memory state only (rooms/participants/chat 200/whiteboard 1500); binaries never pass through the socket (file:shared relays metadata only).
- Deviations (documented): duplicate join acks error 'ALREADY_IN_ROOM', not-in-room ops ack 'NOT_IN_ROOM' (codes not specified in CONTRACTS.md); participant:state broadcast to whole room incl. sender; system chat messages use userId/socketId 'system' and name 'System'.
- Frontend next: connect via io('/?XTransformPort=3003', { auth: { token } }) per CONTRACTS.md client reference.
---
Task ID: 3-4-5-6
Agent: lead (Z.ai Code orchestrator)
Task: Frontend foundation + meeting room (WebRTC mesh, controls, screen share) + chat/files/whiteboard + security & error polish

Work Log:
- Built src/lib/rtc/* (types, api-client with ApiError, format helpers incl. describeMediaError).
- Built zustand store (src/store/useAppStore.ts): auth/user, view state machine (boot/auth/lobby/prejoin/meeting), participants map, media state, chat, whiteboard actions.
- Built src/services/socket.ts: singleton socket.io client (io('/?XTransformPort=3003'), JWT from /api/auth/token), full handler binding, auto-reconnect + re-join flow, token refresh on Unauthorized.
- Built src/services/webrtc.ts: PeerManager mesh — newcomer-initiated offers, sendrecv transceivers (no renegotiation for toggles), replaceTrack screen sharing, ICE queue, restartIce on failure, lazy media acquisition.
- Built src/hooks/useMeeting.ts: createMeeting/joinByRoomId/enterMeeting/leaveMeeting/boot orchestration.
- Built UI: AuthScreen (tabs login/register), Lobby (create/join tabs, history, profile dropdown, ?room= deep link), ProfileDialog, PreJoin (device preview, permission-denied flows, join-without-media path), MeetingRoom (header w/ live badge, video grid, spotlight for screen share, whiteboard w/ filmstrip, side panels), VideoTile (avatar fallback, connecting/failed overlays, fullscreen), ControlsBar (mic/cam/screen/whiteboard/chat/participants/leave), ChatPanel (own/other bubbles, file cards w/ upload progress + download), ParticipantsPanel (status icons), Whiteboard (pencil/eraser/rect/ellipse/line, colors, width, clear, normalized 0..1 coords, dpr-aware).
- page.tsx = SPA root switching views; layout metadata updated; globals.css got .wb-scroll slim scrollbars.
- Fixed lint errors (empty interface, missing Avatar import, dynamic icon component, setState-in-effect) and tsc errors (bun:sqlite excluded from root tsconfig, erase action color).
- bun run lint → clean; bunx tsc --noEmit → clean for src.

Stage Summary:
- Full frontend complete. REST (2-a) + socket service (2-b) + UI integrated against docs/CONTRACTS.md.
- Remaining: Agent Browser E2E verification + README/docs.
---
Task ID: 7
Agent: lead (Z.ai Code orchestrator)
Task: Phase 12 — Agent Browser E2E verification & fixes

Work Log:
- Discovered gateway runs on port 81 (not 3000); re-ran all E2E tests through the gateway so ?XTransformPort routing works.
- Verified via agent-browser: register (Alice) → lobby; create meeting → prejoin (graceful no-camera alert + copy invite chip) → join without media → meeting room (Live badge, self tile avatar, controls bar).
- Two-tab multi-participant test: tab 2 joined same room; participant count 2 both tabs; WebRTC peer connections reached 'connected' (no connecting/failed overlays); remote tile rendered.
- Chat: sent tab1→tab2 and tab2→tab1, both received live; history replayed to late joiner; system join/leave messages work; unread badge works.
- Whiteboard: drew stroke in tab 2 → pixel-identical sync in tab 1 (2003 non-white px on both); toolbar (pencil/eraser/shapes/colors/width/clear) rendered; filmstrip during whiteboard mode OK.
- Files: uploaded plan-notes.txt via chat panel (progress UI) → file card broadcast to tab 2 → download intact; unauthenticated download → 401.
- Leave: tab 2 leave → tab 1 count 2→1 + system message; tab 1 leave → lobby + history refresh; invalid room ID → "Meeting not found" toast; logout → auth screen; mobile viewport (390x844) lobby + meeting verified.
- Fixes made during verification: (1) PreJoin cleanup stopped camera tracks when entering meeting → enteringRef guard; (2) leaveMeeting cleanup; (3) room:leave/room:info server handlers crashed when client sent payload+ack ("ack is not a function") → tolerant ...args signature; (4) history not refreshed after login → refreshHistory on auth success.
- Cleaned test data (DB rows + uploads). Final lint clean, dev.log clean, rtc-server log clean after regression join→leave cycle.

Stage Summary:
- All golden-path flows verified end-to-end in a real browser. 4 bugs found and fixed. App is demo-ready.

---
Task ID: 8
Agent: lead (Z.ai Code orchestrator)
Task: Phase 13 — README, documentation, final summary

Work Log:
- Wrote comprehensive README.md: features, architecture diagram, WebRTC architecture (mesh, signaling flow, STUN/ICE/TURN explanation, renegotiation-free design), file-sharing architecture + limits, security practices + honest limitations, project structure, setup instructions, manual testing checklist, production deployment considerations, known limitations.
- Stack mapping documented (Express→Next route handlers, Mongoose→Prisma, embedded socket→dedicated mini-service).
- Cleaned all smoke/test data; worklog finalized.

Stage Summary:
- Project complete: Next.js 16 SPA (auth/lobby/prejoin/meeting), REST API (JWT+bcrypt+zod), Socket.io signaling mini-service (port 3003), Prisma/SQLite (User/Meeting/MeetingParticipant/SharedFile), real WebRTC mesh with STUN, screen share via replaceTrack, chat, file sharing (REST+socket notify), collaborative whiteboard. Lint+tsc clean. E2E browser-verified.

---
Task ID: 9
Agent: lead (Z.ai Code orchestrator)
Task: Debug & fix "Internal server error" on Sign in / Create account

Work Log:
- Diagnosis from dev.log: register 500 fired AFTER a successful INSERT (retries returned 409 → rows persisted); login 500 fired AFTER the user SELECT. Pattern pointed past-DB failure → JWT signing.
- Root cause: root .env had been reduced to DATABASE_URL only — JWT_SECRET (and JWT_EXPIRES_IN/UPLOAD_MAX_MB) were gone; mini-services/rtc-server/.env and .env.example were missing entirely; uploads/ dir and src/app/api/files/upload/route.ts were also lost. signToken() → getJwtSecret() threw 'JWT_SECRET is not configured'; routes' silent `catch {}` converted it to generic 500 with zero server-side logging.
- Fixes: (1) regenerated JWT_SECRET (openssl rand -hex 32) into root .env (+JWT_EXPIRES_IN=7d, UPLOAD_MAX_MB=15) and mirrored the identical secret into recreated mini-services/rtc-server/.env (+SOCKET_PORT=3003), chmod 600; (2) wrote .env.example with safe placeholders; (3) added internalError(scope, err) to src/lib/api.ts — always console.errors the real cause server-side, maps env-config errors to actionable 503 naming the variable (never the value), otherwise generic safe 500; wired into ALL route catch blocks (auth register/login/logout/me/token, profile, meetings POST/GET + [roomId], files upload/[id]); (4) restored src/app/api/files/upload/route.ts per CONTRACTS.md (auth 401, size→413, MIME allowlist→415, roomId→404, sanitized basename ≤120, uploads/<cuid><ext> mode 0600, metadata-only DB row) + recreated uploads/ (0700); fixed own bug: referenced meeting.roomId while select={id:true} → PrismaClientValidationError, switched to normalized roomId var; (5) purged ghost users thanu01/thanu0501 (created during broken window: INSERT succeeded, response 500) for a clean slate; (6) restarted next dev (full detach, .env reload) + rtc-server.
- Verification: 26 curl checks all pass — register 200(+Set-Cookie)/409 username/409 email/400 weak pw/400 missing fields; login 200 by username/200 by case-insensitive email/401 wrong pw/401 ghost user/400 empty; me 200/401; token 200; logout→me 401; upload roundtrip byte-identical w/ correct headers; 415/404/401 upload guards; 401 download; dashed roomId 200; bcrypt $2b$10$ hash (60 chars) in DB; cookie HttpOnly SameSite=lax Path=/ Max-Age=604800.
- Browser E2E (agent-browser via gateway :81): UI Create account → lobby; Sign out; wrong password → 'Invalid credentials'; correct sign in → 'Welcome back'; duplicate username → 'Username is already taken'; mobile 390x844 layout OK; no console/page errors. socket.io-client handshake with /api/auth/token JWT accepted by rtc-server (shared secret OK).
- lint + tsc clean; dev.log shows no 500/503 since restart. Final DB clean (all tables 0 rows), test artifacts removed.

Stage Summary:
- Auth fully repaired: root cause was missing JWT_SECRET (silent env loss), not code/logic. Error handling now fail-loud server-side / fail-safe client-side.
- Restored env files, .env.example, uploads/, files/upload route. Both services healthy (3000 Next, 3003 rtc-server).
- Ghost user accounts deleted — users should re-register via Create account.

---
Task ID: 10
Agent: lead (Z.ai Code orchestrator)
Task: Premium light UI theme across the whole app

Work Log:
- Inspected theme system: Tailwind 4 @theme inline + shadcn semantic tokens; all UI components token-driven → retheme via globals.css variables, then per-component polish.
- globals.css: light-only tokens (bg #F8FAFC, card #FFF, secondary/muted #F1F5F9, primary emerald #059669, fg #0F172A, muted-fg #64748B, border/input #E2E8F0, ring #10B981, destructive #DC2626 soft red, accent emerald-50/900), radius 0.75rem (xl=16px), added --shadow-card/--shadow-pop elevation tokens, removed .dark block, light scrollbars, ::selection tint.
- ui components: Input h-10 rounded-lg bg-card placeholder muted/80; Tooltip neutral slate-900 (was bg-primary); button default keeps token primary.
- page.tsx: light boot screen; footer cleaned — removed "Full Stack Development Internship" (now brand + tech line only).
- AuthScreen: centered premium card (rounded-2xl, shadow-pop), h-11 inputs, segmented tabs (white active chip on secondary track, h-11 rounded-xl), emerald brand block h-16 shadow-lg, trust footnote.
- Lobby: emerald/50→background gradient, refined header brand, segmented tabs, shadow-card meeting cards + hover:shadow-md, refined empty state (icon chip), section label uppercase tracking, rounded buttons.
- PreJoin: dark→light (page bg gradient, white chrome, dark video surface kept, white status pills w/ backdrop blur, light amber-50 warning alert, white circular mic/cam toggles w/ soft-red off state, emerald Join now w/ shadow-md emerald/20).
- MeetingRoom: light stage (bg-secondary/60), white header + badges (card bg, border, Live dot emerald), amber-50 reconnect banner, side panel bg-card shadow-pop (mobile overlay), desktop flat.
- ControlsBar: floating white bar (bg-card/95 border shadow-pop backdrop-blur); states: inactive bg-secondary, active non-accent primary/10 tint, accent active solid primary, danger solid rose-600→700; count chip ring-border; badges ring-card.
- VideoTile: light frames (border-slate-300/70, shadow-card, ring-primary for presenter); dark media surface + on-video overlays intentionally kept (Meet-style).
- ChatPanel: light bubbles (own = primary, others = secondary+border), file cards white shadow-card w/ accent icon chip, emerald upload progress on accent panel, clean composer; added MessageSquare import for empty state.
- ParticipantsPanel: white, hover secondary/70, count chip, muted status icons, soft rose off-states.
- Whiteboard: white toolbar, active tool solid primary, color swatch selection ring-primary, clear = white/rose-600 outline hover rose-50, canvas on secondary wrapper rounded-xl shadow-card.
- ProfileDialog: default token primary save button.
- DEBUG: browser showed stale Turbopack CSS (--primary #171717 from persistent cache) → killed server, rm -rf .next, restarted → tokens live.
- Verified via agent-browser: auth (desktop/tablet/mobile), register→lobby, create meeting→prejoin (no-camera amber alert), join→meeting (light header/stage/controls), chat send (emerald bubble), participants panel, whiteboard, leave→history w/ Host badge, logout→login round-trip. No horizontal scroll at 390px. No console/page errors. lint+tsc clean.
- Cleanup: removed themetest user + Premium theme review meeting + orphan participant. PRESERVED real user data: thanu01 account + 'Sprint stand_up' meeting (6CD5BRQBTD) created by the user during testing.

Stage Summary:
- Whole app is a premium light SaaS theme (slate neutrals + emerald accent, soft shadows, 12–16px radii, Geist). Zero dark-mode surfaces except intentional video/tile media surfaces. No functionality, API, auth, DB, or socket changes.
