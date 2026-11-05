# Project Worklog — Social Media Platform (CodeAlpha Full Stack Internship)

Single shared worklog. Append-only. Each agent appends a section starting with `---`.

---
Task ID: 1
Agent: main (Super Z)
Task: Environment init, architecture decision, workspace preparation

Work Log:
- Loaded fullstack-dev skill; inspected sandbox (Debian 13, Node 24, bun 1.3.14, npm registry + fastdl.mongodb.org reachable, Caddy gateway proxies external traffic to localhost:3000).
- Decision: honor the user's explicitly pinned stack for CodeAlpha — React.js (Vite) client + Express.js REST API + MongoDB/Mongoose + JWT auth. The default Next.js/Prisma scaffold does not match the internship submission requirements.
- Ran init script, then stopped the auto-started Next dev server and removed scaffold files (src/, prisma/, db/, public/, examples/, tests/, Next configs) to keep a clean client/server repo layout.
- Created structure: client/src/{components/{layout,common,posts,users,notifications,routing},pages,context,services,hooks,utils}, server/{controllers,routes,models,middleware,services,config,utils,uploads}, scripts/, data/db.
- Prepared scripts/mongo-dl to download the official mongod binary (real persistent daemon on 127.0.0.1:27017, dbpath /home/z/my-project/data/db).

Stage Summary:
- Port 3000 reserved for the Express app (API + built React client) per gateway config.
- Architecture contract (final): 6 Mongoose models (User, Post, Comment, Like, Follow, Notification) with compound-unique indexes on Like{user,post} and Follow{follower,following}; denormalized counters (likeCount, commentCount, followersCount, followingCount, postsCount) for cheap feeds; notification service skips self-actions and deletes the matching notification on unlike/unfollow.
- REST API: /api/auth (register, login, me, logout), /api/users (PUT /me with avatar upload, GET /search, GET /username/:username + /posts + /followers + /following), /api/posts (feed with pagination + likedByMe, CRUD, like/unlike, likes list, comments list), /api/comments (POST /, DELETE /:id), /api/follows (POST/DELETE /:userId), /api/notifications (list, unread-count, read-all, :id/read).
- Security: bcryptjs(12 rounds), JWT Bearer, helmet, CORS allowlist, rate limiting (auth 50/15m, api 1000/15m), multer file filter 5MB, ownership authorization, input validation, centralized error handler mapping Mongo/JWT/multer errors.
- Frontend contract: React 18 + react-router v6 + axios; AuthContext with token in localStorage + 401 interceptor; pages Feed / Login / Register / Profile(:username, tabs posts-followers-following) / PostDetail / EditProfile / Search / Notifications / 404; optimistic like UI; unread badge polled in navbar; mobile bottom nav.

---
Task ID: 2-12 (implementation, testing, verification, delivery)
Agent: main (Super Z)
Task: Implement, test and deliver the Connectify full-stack social media platform

Work Log:
- Server (Express + Mongoose): 6 models with compound-unique indexes (Like, Follow), denormalized counters, JWT auth middleware, centralized error handler (11000/CastError/JWT/multer mapping), multer uploads (MIME filter, 5MB, randomized names), helmet+CORS+rate limiting, notification service (self-actions skipped, removed on unlike/unfollow), 6 controllers, 6 route modules, seeder with realistic demo graph.
- Client (React 18 + Vite): custom CSS design system (no UI framework), AuthContext with token restore + 401 interceptor, axios services per resource, 9 pages, 14 components, inline SVG icon set, optimistic likes, debounced search, unread badge polling (25s), mobile bottom nav, skeletons/empty/error states.
- Fixed during development: missing GET /posts/:postId/comments route mount, route param mismatch (:id vs :postId), missing LockIcon import (runtime crash on /register), helmet default CSP blocking external seed images (img-src extended), Spinner named/default export mismatch.
- Testing: scripts/api-test.mjs — 80 assertions covering auth (validation, duplicates, email-or-username login, forged tokens), profiles + avatar upload + static serving, post CRUD + 403 authorization, like idempotency + notification create/remove, comment lifecycle, follow rules, search, notifications read state, deletion cascades, 404 JSON. Final result: 80 passed / 0 failed.
- Browser E2E (agent-browser): login redirect guard, demo login, UI post creation (201 + prepended + composer reset), like/unlike toggle, comment add, profile tabs with live counts, search + follow from results, notification click-through to post detail, mark-all-read, register -> auto-login, mobile 390px layout (bottom nav), console clean.
- Ops: MongoDB 7.0.24 daemon (official binary, persistent dbpath ./data/db) on 127.0.0.1:27017; Express serves API + built SPA on port 3000 per Caddy gateway; root package.json orchestrates dev/build/seed/start; worklog + README.md + docs/API.md + .gitignore + .env.example files written; deliverable zip created.

Stage Summary:
- DELIVERABLE: full-stack social platform at /home/z/my-project (client/ + server/), zip at download/social-media-platform.zip (105 files), screenshots at download/screenshots/.
- API contract documented in docs/API.md; run/test/deploy instructions in README.md; test accounts: alex@demo.com etc. / Password123.
- Verification state: 80/80 API tests green, browser E2E golden path green, DB re-seeded to pristine demo state, server running on :3000 with mongod on :27017.

---
Task ID: 13 (continuation session)
Agent: main (Super Z)
Task: Post-restart verification, bug fix, final re-delivery

Work Log:
- Environment re-initialized; confirmed mongod (:27017) and Express (:3000) survived restart; SPA + API health-checked (200 / 404 JSON / 401 JSON).
- Re-ran scripts/api-test.mjs: 80/80 PASS. Re-seeded DB to pristine demo state (6 users / 12 posts / 27 likes / 9 comments / 17 follows).
- Full browser E2E re-verification: auth guard (/ -> /login), demo login, feed render, post creation (POST /api/posts 201, composer reset, prepend), like toggle (POST like 200, aria-label flips), comment flow (POST /api/comments 201 + delete button rendered), search page (live results + follow -> POST /api/follows 200 -> Unfollow state), notifications page (list + read-all PUT 200), mobile 390px layout (collapsed navbar + bottom-nav tabs), console clean.
- FOUND + FIXED real bug: navbar unread badge stayed stale after "Mark all read" while remaining on /notifications (badge only refreshed on route change / 25s poll). Fix: window event 'notifications:changed' dispatched by NotificationsPage.markAllRead and NotificationItem.go; Navbar listens and re-fetches unread count. Client rebuilt (index-DlxxMXKv.js); fix verified in browser: badge "1 unread" -> cleared instantly.
- Automation note: agent-browser ref-based clicks intermittently missed React buttons (stale ref coordinates); app correctness proven via elementFromPoint checks, event instrumentation (click:btn -> submit:form) and direct element clicks; no app defect in click handling.
- Final: 80/80 API tests re-passed, DB re-seeded pristine, desktop + mobile screenshots captured to download/screenshots/, deliverable zip rebuilt at download/social-media-platform.zip (104 entries, includes badge fix).

Stage Summary:
- DELIVERABLE RE-CONFIRMED: /home/z/my-project (client/ + server/), zip refreshed with notification-badge fix, all verification green. Test accounts unchanged: alex@demo.com etc. / Password123.

---
Task ID: 14 (single-file edition)
Agent: main (Super Z)
Task: Build the entire platform as ONE self-contained HTML file

Work Log:
- Built download/connectify-single-file.html (~1960 lines, 104KB, zero dependencies, works offline from file://).
- Architecture mapping: Express controllers -> in-browser API layer with identical REST routes/status codes (400/401/403/404/409), validation and ownership authorization, plus 120-260ms simulated latency so loading states render. MongoDB collections -> localStorage (users/posts/comments/likes/follows/notifications) with same compound-unique like{user,post} and follow{follower,following} semantics. jsonwebtoken HS256 -> REAL HMAC-SHA256 JWTs via WebCrypto (signature + exp verified on every call). bcrypt -> SHA-256 + per-user random salt (browser crypto.subtle cannot do bcrypt; documented honestly). multer -> FileReader + canvas resize (900px/q0.72 for posts, 300px avatars) -> dataURL.
- Features: auth guard, login (email OR username), register, hash router (#/ #/login #/register #/search #/notifications #/profile/:u #/post/:id #/settings/profile), feed with composer + image attach + preview + char count, post cards with owner menu (edit inline / delete with cascade confirm), optimistic likes with rollback, lazy-loaded comments with add/delete, profile with cover + counters + tabs (posts/followers/following), debounced user search with follow buttons, notifications with badge/mark-read/mark-all + click-through, edit profile with avatar upload, toasts, confirm dialogs, image zoom modal, skeletons, empty states, mobile bottom nav + safe areas, SVG data-URI avatars/seed images (fully offline).
- Seed on first run: 6 users / 12 posts / 27 likes / 9 comments / 17 follows / 44 notifications (same demo community, alex@demo.com / Password123).
- FIXED during E2E: (1) API router matched route literals against full path INCLUDING query string so paginated GETs 404ed -> reassign path=pathOnly; (2) base64url padding missing in JWT atob -> pad before decode; (3) outside-click handler REMOVED post menus from DOM breaking reopen -> hide instead; (4) live follower-count selector looked for <b> inside [data-counter] but data-counter IS the <b> -> fixed selector; (5) refreshBadge wiped bottom-nav Alerts tab content -> dedicated [data-badge-slot] spans.
- E2E verified via agent-browser: cold boot + seed, auth guard, login, post create/prepend, optimistic like, comment add, persistence after reload (token + data), pagination (10->13), search + follow/unfollow with live counts, notifications + badge clear, profile tabs (3 followers / 2 following rows), edit bio -> redirect, register (hash+salt stored, no plaintext), validation matrix (dup 409, bad name/email 400, short pw 400, self-follow 400), mobile 390px (bottom nav 4 tabs, badge on Alerts, no horizontal overflow), desktop 1440px, console clean.

Stage Summary:
- NEW DELIVERABLE: /home/z/my-project/download/connectify-single-file.html — the complete platform in one file, verified green. Existing MERN zip + docs unchanged.

---
Task ID: 2 (single-file conversion)
Agent: Super Z (main)
Task: Convert the entire Connectify MERN project into ONE self-contained index.html that runs by double-clicking (file://), preserving all features and UI.

Work Log:
- Re-read all client components/pages/CSS and server controllers/validators/seeder to capture exact behaviors, error messages, ordering and pagination.
- Built /home/z/my-project/download/index.html (~3,400 lines, 136 KB): one <style> block (full design system copied from index.css + lightbox/additions) and one <script> block (vanilla JS SPA).
- Architecture: hash router (#/ #/login #/register #/search #/notifications #/profile/:u #/post/:id #/settings/profile), localStorage store mirroring the 6 Mongo collections, seed data 1:1 port of seeder.js (6 users/12 posts/17 follows/26 likes/9 comments/notifications with read flags), API layer replicating every controller incl. exact error messages and cascade deletes.
- Fixed during self-review: ProfilePage multi-root el() bug; navbar badge not populated pre-mount; autoOpenComments not mounting CommentSection on post detail; ReferenceError in edit-modal input handler (saveBtn scope).
- Browser E2E via agent-browser on file:// (Chrome): login guard, wrong-password + login-by-username, register validation + duplicate 409s + auto-login, create/edit/delete post (with confirm + cascade), like/unlike optimistic toggle, comments add/delete, search debounce + URL sync, follow/unfollow with hover state + live counts, profile tabs (posts/followers/following), notifications (badge=3, click-to-read, mark-all-read badge sync), edit profile + redirect, 404 + missing-post states, image lightbox, logout confirm, reset demo data, session persistence across reload, mobile 390px (bottom nav, hidden desktop UI), offline mode (initials avatars, broken images removed, app fully usable). Final in-page error counter: 0 errors, 0 console warnings. Demo data reset to pristine seed.

Stage Summary:
- Deliverable: /home/z/my-project/download/index.html — single file, zero dependencies, no server/npm/Mongo, works offline via file://.
- Demo login: alex@demo.com / Password123 (all seeded users share Password123); "Reset demo data" lives in the avatar menu.
- Stale draft connectify-single-file.html removed; original MERN ZIP deliverable untouched.
