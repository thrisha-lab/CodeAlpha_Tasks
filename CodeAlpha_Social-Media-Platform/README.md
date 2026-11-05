# Connectify — Full-Stack Social Media Platform

A complete, production-style social media platform built for the **CodeAlpha Full Stack Development Internship**. Real REST API, real database, real authentication — no mocks, no hardcoded data.

![Stack](https://img.shields.io/badge/React%2018-Vite-61dafb) ![Stack](https://img.shields.io/badge/Express-REST%20API-green) ![Stack](https://img.shields.io/badge/MongoDB-Mongoose-47a248) ![Stack](https://img.shields.io/badge/Auth-JWT%20%2B%20bcrypt-orange)

---

## ✨ Features

| Area | Implemented |
|------|-------------|
| **Authentication** | Register, login (email **or** username), logout, JWT (7-day expiry), bcrypt password hashing (12 rounds), protected routes, persistent session restore, global 401 handling |
| **User Profile** | Avatar (upload), name, unique @username, bio, email, editable profile, live followers/following/posts counters, view other profiles |
| **Posts** | Create (text + optional image upload up to 5MB), edit (author only), delete (author only, cascades likes/comments/notifications), feed pagination |
| **Likes** | Like / unlike, duplicate prevention via **DB unique index** (race-condition safe), optimistic UI with rollback, likes list |
| **Comments** | Add, view (oldest-first), delete own, author + timestamp display, comment counters |
| **Follows** | Follow / unfollow, self-follow & duplicate prevention (unique index + validation), followers & following lists with follow-state flags |
| **Feed** | Latest-first feed, post cards, create-post composer, "load more" pagination, skeleton loaders, empty states |
| **Search** | Debounced live search by name/username, results with avatar, name, @username, bio and inline follow button |
| **Notifications** | In-app notifications for likes, comments and new follows, unread badge (auto-polled), mark one/all read, click-through to relevant content, notification removed when the action is undone |
| **Security** | JWT Bearer auth, bcrypt, `helmet` (CSP & security headers), CORS allowlist, rate limiting (auth + global), input validation layer, ownership authorization on every mutation, Mongo duplicate/Cast error mapping, filename-randomized uploads with MIME filter |
| **UI/UX** | Responsive top navbar + mobile bottom tab bar, modal dialogs, confirm dialogs, spinners, skeletons, error/empty states, image previews, character counters |

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, React Router 6, Axios, hand-crafted modern CSS (custom design system, zero UI framework) |
| Backend | Node.js, Express 4, REST architecture, middleware pipeline |
| Database | MongoDB with Mongoose ODM (compound unique indexes, denormalized counters) |
| Auth | JSON Web Tokens (`jsonwebtoken`), password hashing (`bcryptjs`) |
| Uploads | `multer` (disk storage, MIME filter, 5MB limit, randomized filenames) |
| Security | `helmet`, `express-rate-limit`, `cors`, centralized error handler |

---

## 📁 Project Structure

```
social-media-platform/
├── client/                        # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/            # Avatar, Modal, ConfirmDialog, Alert, Spinner, EmptyState
│   │   │   ├── layout/            # Navbar (badge + dropdown), Layout (auth guard + bottom nav)
│   │   │   ├── notifications/     # NotificationItem
│   │   │   ├── posts/             # CreatePost, PostCard, CommentSection, PostsList
│   │   │   ├── routing/           # (guard lives in Layout)
│   │   │   ├── users/             # UserCard, FollowButton
│   │   │   └── icons.jsx          # Inline SVG icon set (no icon library needed)
│   │   ├── context/               # AuthContext (global auth state)
│   │   ├── hooks/                 # useDebounce
│   │   ├── pages/                 # Feed, Login, Register, Profile, PostDetail,
│   │   │                          # EditProfile, Search, Notifications, 404
│   │   ├── services/              # api.js (axios instance) + one module per resource
│   │   ├── utils/                 # format helpers (timeAgo, initials, image URLs)
│   │   ├── App.jsx                # Router + providers
│   │   ├── index.css              # Complete design system
│   │   └── main.jsx
│   ├── .env.example
│   └── vite.config.js             # Dev proxy /api + /uploads -> Express
│
├── server/                        # Express REST API
│   ├── config/db.js               # Mongoose connection
│   ├── controllers/               # auth, users, posts, comments, follows, notifications
│   ├── middleware/                # auth (JWT), errors, upload (multer), rate limiter
│   ├── models/                    # User, Post, Comment, Like, Follow, Notification
│   ├── routes/                    # /api/auth /api/users /api/posts /api/comments
│   │                              # /api/follows /api/notifications
│   ├── services/                  # notificationService (create/remove social notifications)
│   ├── uploads/                   # Uploaded images (served statically at /uploads)
│   ├── utils/                     # ApiError, asyncHandler, validators, generateToken
│   ├── .env.example
│   ├── app.js                     # Express app (helmet, CORS, routes, SPA serving)
│   ├── seeder.js                  # Demo data seeder
│   └── server.js                  # Entry point
│
├── scripts/api-test.mjs           # 80-assertion end-to-end API test suite
├── package.json                   # Root orchestration scripts
└── README.md
```

---

## 🚀 Environment Setup

### Prerequisites

- **Node.js 18+** (tested on Node 20/24)
- **MongoDB** — either:
  - Local community server (<https://www.mongodb.com/try/download/community>), **or**
  - A free **MongoDB Atlas** cluster (<https://www.mongodb.com/atlas>)

### 1. Install dependencies

```bash
# from the repo root
npm run install:all          # installs server/ and client/ dependencies
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env    # optional (defaults work out of the box)
```

Then edit `server/.env`:

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `NODE_ENV` | no | `development` | `production` serves the built client from Express |
| `PORT` | no | `5000` | API port in dev; use 3000 for single-origin prod |
| `MONGODB_URI` | **yes** | `mongodb://127.0.0.1:27017/connectify` | Local Mongo **or** Atlas connection string |
| `JWT_SECRET` | **yes** | any long random string | Generate: `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | no | `7d` | Token lifetime |
| `CLIENT_URL` | no | `http://localhost:5173` | Comma-separated CORS allowlist (lock down in production) |

### 3. Start MongoDB

```bash
# local service (usually runs automatically after install)
mongod --version         # verify
# Atlas: just paste the connection string into MONGODB_URI
```

### 4. Seed demo data (optional but recommended)

```bash
npm run seed
```

Creates 6 users, 12 posts, likes, comments, follows and notifications.

### 5. Run

**Development (two terminals, hot reload):**

```bash
npm run dev:server     # Express API  -> http://localhost:5000
npm run dev:client     # Vite client  -> http://localhost:5173 (proxies /api)
```

**Production (single origin):**

```bash
npm run build          # builds client -> client/dist
npm start              # Express serves API + UI on http://localhost:3000
```

---

## 🧪 Test Accounts

After seeding, every account uses the password **`Password123`**:

| Email | Username | Name |
|-------|----------|------|
| `alex@demo.com` | `alex_rivera` | Alex Rivera |
| `priya@demo.com` | `priya_sharma` | Priya Sharma |
| `john@demo.com` | `john_chen` | John Chen |
| `sara@demo.com` | `sara_ahmed` | Sara Ahmed |
| `mike@demo.com` | `mike_torres` | Mike Torres |
| `emma@demo.com` | `emma_wilson` | Emma Wilson |

---

## ✅ Testing

### Automated API suite (80 assertions)

```bash
# with the server running:
node scripts/api-test.mjs
```

Covers registration/login validation, duplicate accounts, protected routes, forged tokens, profile updates, avatar upload + static serving, post CRUD + authorization (403s), like/unlike idempotency, comment lifecycle, follow/unfollow, search, notifications, deletion cascades and 404 handling.

### Manual test flow

1. Register a new account → you land on the feed, logged in.
2. Create a post (with and without an image).
3. Like/unlike it and others' posts — counts update instantly; duplicate likes are impossible.
4. Comment, delete your comment; try deleting someone else's via the API (403).
5. Edit and delete your own post (menu on your cards only).
6. Follow/unfollow people from Search or a profile — watch counts and the notification badge.
7. Log in as another seeded user in a second browser to see notifications arrive.
8. Log out; try opening `/` — you are redirected to `/login`; API calls return 401.

---

## 🔐 Security Measures

- Passwords hashed with **bcrypt (12 rounds)**; passwords are `select: false` and stripped from every response.
- **JWT** Bearer authentication with expiry; invalid/expired tokens return 401 and the client resets the session.
- **Authorization checks** on every mutation — users can only edit/delete their own posts and comments; only the notification owner can read it.
- **Duplicate-relationship prevention** at the database level (`Like {user, post}` and `Follow {follower, following}` compound unique indexes) plus friendly 409 responses.
- **Input validation** on every endpoint (shape, length, format, ObjectIds) with consistent 400/404/409 handling.
- **helmet** security headers + CSP; **CORS** allowlist via `CLIENT_URL`; **rate limiting** (50/15min auth, 1000/15min global).
- Uploads restricted to JPEG/PNG/GIF/WebP, max 5MB, stored under randomized names (no user-controlled paths).
- React escapes all rendered content (XSS-safe by default); no `dangerouslySetInnerHTML` anywhere.

---

## 🗄️ Database Design

```
User ──┬──< Post          (author)
       ├──< Comment       (author)
       ├──< Like          (user)     unique(user, post)
       ├──< Follow        (follower) unique(follower, following)
       └──< Notification  (recipient, sender, type: like|comment|follow)

Post ──┬──< Comment       (post)
       └──< Like          (post)
Notification ──> Post / Comment (optional context refs)
```

Counters (`likeCount`, `commentCount`, `followersCount`, `followingCount`, `postsCount`) are denormalized and updated atomically (`$inc`) so feeds and profiles stay fast. Deleting a post cascades to its likes, comments, notifications and uploaded file.

Full endpoint reference: **[docs/API.md](docs/API.md)**

---

## 📦 Push to GitHub

```bash
cd social-media-platform
git init
git add .
git commit -m "feat: full-stack social media platform (React + Express + MongoDB)"
git branch -M main
git remote add origin https://github.com/<your-username>/social-media-platform.git
git push -u origin main
```

> `.gitignore` already excludes `node_modules/`, `client/dist/`, `.env` files and uploaded images.

---

## ☁️ Deployment (free tier)

**Option A — Single service (simplest):**

1. Create a free **MongoDB Atlas** cluster → get the connection string.
2. Push the repo to GitHub, then create a **Render Web Service** (or Railway) from the repo:
   - Build: `npm run install:all && npm run build`
   - Start: `npm start`
   - Env vars: `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, `PORT=3000` (Render injects `PORT` automatically — `server.js` reads it)
3. Express serves both the API and the built React app from one URL — no CORS issues.

**Option B — Split deployment:**

- Frontend → **Vercel** (root: `client/`, build `npm run build`, output `dist`) with `VITE_API_URL=https://your-api.onrender.com/api`
- Backend → **Render/Railway** with `CLIENT_URL=https://your-frontend.vercel.app`
- Enable "Persistent disk" on the backend for `server/uploads`, or swap multer storage to S3/Cloudinary for production scale.

---

## 🧯 Troubleshooting

| Problem | Fix |
|---------|-----|
| `MongooseServerSelectionError` | MongoDB isn't running or the URI is wrong — start `mongod` / re-check the Atlas string (allowlist your IP). |
| `CORS` errors in dev | Keep using the Vite proxy (default) or add the client origin to `CLIENT_URL`. |
| Images 404 after restart | `server/uploads` holds uploads — don't delete it; seed images use external URLs (need internet). |
| Port already in use | Change `PORT` in `server/.env` and the Vite proxy target in `client/vite.config.js`. |
| Badge not updating | It polls every 25s and refreshes on navigation — click anywhere/switch tabs to force it. |

---

Built as a CodeAlpha Full Stack Development internship project — React.js + Node.js/Express.js + MongoDB + JWT.
