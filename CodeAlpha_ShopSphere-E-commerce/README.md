# 🛍️ ShopSphere — Full-Stack E-commerce Store

A complete, production-style full-stack e-commerce application. It features product listings,
product details, search & filter, a persistent shopping cart, JWT-based
authentication, a full checkout flow, order management, and a protected **admin
dashboard** with CRUD for products, order-status management, and user lists.

> **About the stack.** The original task brief suggested React + Express +
> MongoDB. This project implements the **same architecture and every feature**
> using a modern, production-grade monorepo stack: **Next.js 16 (App Router) +
> TypeScript + Prisma (SQLite) + NextAuth (JWT) + Tailwind CSS + shadcn/ui**.
> The backend is a clean set of **REST-style API routes** (proper HTTP methods,
> status codes, validation, auth guards), the data layer uses **typed Prisma
> models with relations** (the Next.js equivalent of Mongoose schemas), and
> auth uses **JWT sessions with hashed passwords and protected routes** —
> exactly the patterns the brief asked for.

---

## ✨ Features

| Area | What works |
| --- | --- |
| **Home** | Hero, trust bar, shop-by-category, featured products, new arrivals, promo CTA, sticky footer — fully responsive. |
| **Product listing** | Cards with image, name, price, category, rating, stock, add-to-cart, view-details. Search, category filter, price-range slider, sort (featured/newest/price/rating), pagination, empty state. |
| **Product details** | Image gallery with thumbnails, brand/category, rating + review count, stock status, quantity selector, add-to-cart + buy-now, trust badges, accordion (shipping / reviews), related products. |
| **Cart** | Add / remove / change quantity, line totals, subtotal, estimated shipping + tax, total, item-count badge, empty state, **persisted to `localStorage`** across reloads. |
| **Auth** | Register, login, logout, profile (edit name/phone), JWT sessions via NextAuth Credentials, **scrypt password hashing**, role-based authorization. |
| **Checkout** | Shipping form with Zod validation, order summary with live totals (8% tax, free shipping over $75, flat $6.99 otherwise), COD payment, order creation with **atomic stock decrement**. |
| **Orders** | “My orders” list with status badges + thumbnails, order detail with a status timeline, shipping address, itemized totals. |
| **Admin** | Protected admin area (role guard) with Dashboard (revenue, product/order/user counts, recent orders, low-stock), Products (create/edit/delete with dialog forms), Orders (update status), Users (list). |
| **UX/Security** | Toast feedback, loading skeletons, empty/error states, 404 handling, input validation, protected routes, admin authorization, env-based secrets. |

---

## 🧱 Tech Stack

- **Frontend:** React 19, Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui (New York), lucide-react, framer-motion, sonner (toasts), TanStack Query, Zustand.
- **Backend:** Next.js Route Handlers (`/api/*`) as REST endpoints — proper HTTP verbs, status codes, Zod validation, centralized auth/admin guards.
- **Database:** Prisma ORM + SQLite (file-based, zero-config). Schemas: `User`, `Category`, `Product`, `Order`, `OrderItem` with relations + indexes.
- **Auth:** NextAuth.js v4 (Credentials provider, JWT strategy, role in token/session). Passwords hashed with Node `crypto.scrypt` (no extra deps).

---

## 📁 Project Structure

```
shopsphere/
├─ prisma/
│  ├─ schema.prisma         # User, Category, Product, Order, OrderItem models
│  └─ seed.ts               # Seeds admin, demo customer, 5 categories, 55 products
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx          # Root layout + fonts
│  │  ├─ page.tsx            # Single-route SPA shell + view router
│  │  ├─ globals.css         # Theme (emerald + amber), utilities
│  │  └─ api/                # REST API (Route Handlers)
│  │     ├─ auth/[...nextauth]/route.ts
│  │     ├─ auth/register/route.ts
│  │     ├─ products/route.ts           # GET list/search/filter + POST create
│  │     ├─ products/[id]/route.ts      # GET / PUT / DELETE
│  │     ├─ products/featured/route.ts
│  │     ├─ products/new/route.ts
│  │     ├─ categories/route.ts
│  │     ├─ orders/route.ts             # GET user orders + POST create
│  │     ├─ orders/[id]/route.ts        # GET detail + PUT status (admin)
│  │     ├─ admin/orders/route.ts       # GET all orders (admin)
│  │     ├─ admin/users/route.ts        # GET all users (admin)
│  │     └─ users/me/route.ts           # GET/PUT profile
│  ├─ components/
│  │  ├─ ui/                 # shadcn/ui components
│  │  └─ storefront/         # Header, Footer, ProductCard, ProductImage, RatingStars, EmptyState, AppToaster
│  ├─ hooks/                 # use-products, use-orders, use-auth, use-profile, use-admin
│  ├─ lib/                   # db, auth, auth-helpers, password, mappers, api, format, constants
│  ├─ providers/             # QueryClient + SessionProvider + theme init
│  ├─ store/                 # cart-store (Zustand+persist), ui-store (SPA route + theme)
│  ├─ types/                 # Shared DTOs + NextAuth type augmentation
│  └─ views/                 # home, products, product-detail, cart, checkout,
│     │                        order-success, orders, order-detail, login, register, profile
│     └─ admin/              # admin-view + dashboard/products/orders/users
├─ .env.example
├─ package.json
└─ README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js 18+** and **Bun** (used as the package runner here; `npm`/`pnpm` work too).
- Git.

### 2. Install dependencies
```bash
bun install
# or: npm install
```

### 3. Environment variables
Copy the example and tweak if needed:
```bash
cp .env.example .env
```
`.env` contains:
```env
DATABASE_URL="file:./db/custom.db"
NEXTAUTH_SECRET="shopsphere-dev-secret-change-me-in-production-9f2c1a7e"
NEXTAUTH_URL="http://localhost:3000"
```
> In production, generate a real secret: `openssl rand -base64 32` and set
> `NEXTAUTH_URL` to your deployed URL.

### 4. Set up the database
Push the Prisma schema to SQLite and generate the client:
```bash
bun run db:push
```
Then seed it with demo data:
```bash
bun run db:seed
```
This creates **5 categories** and **55 products** (11 per category), plus the two demo accounts below.

### 5. Run the dev server
```bash
bun run dev
# or: npm run dev
```
Open <http://localhost:3000>.

### 6. Lint
```bash
bun run lint
```

---

## 🔑 Test Credentials

Seeded by `bun run db:seed`:

| Role | Email | Password |
| --- | --- | --- |
| **Admin** | `admin@shopsphere.dev` | `admin123` |
| **Customer** | `demo@shopsphere.dev` | `demo123` |

You can also register a brand-new customer account from the Sign-up screen.
The admin role is required to reach the Admin Dashboard (account menu →
*Admin Dashboard*).

---

## 🧪 Try the Golden Path

1. Browse the **home** page → click **Shop All**.
2. Filter by category / price, sort, search. Click a product → view details.
3. **Add to cart** (the header badge increments). Open the cart, change quantities.
4. **Proceed to checkout** → you’ll be asked to **Sign in** (use the demo
   customer or register). Shipping form is pre-filled from your profile.
5. **Place order** → see the confirmation, then **My orders** → order detail
   with a status timeline.
6. **Sign out**, sign in as **admin@shopsphere.dev / admin123**, open the
   account menu → **Admin Dashboard**. Review stats, edit a product, update an
   order’s status, browse users.

---

## 🗺️ API Reference (REST)

All endpoints are relative to the app origin (`/api/*`). Auth uses the
NextAuth JWT cookie (`next-auth.session-token`).

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | – | Register a new customer |
| `POST` | `/api/auth/[...nextauth]` | – | NextAuth login/logout/session |
| `GET` | `/api/products` | – | List + search + filter + sort + paginate |
| `POST` | `/api/products` | admin | Create a product |
| `GET` | `/api/products/[id]` | – | Product detail (by id or slug) |
| `PUT` | `/api/products/[id]` | admin | Update a product |
| `DELETE` | `/api/products/[id]` | admin | Delete a product |
| `GET` | `/api/products/featured` | – | Featured products |
| `GET` | `/api/products/new` | – | New arrivals |
| `GET` | `/api/categories` | – | List categories |
| `POST` | `/api/categories` | admin | Create a category |
| `GET` | `/api/orders` | user | Current user’s orders (`?all=true` for admin) |
| `POST` | `/api/orders` | user | Place an order (atomic stock decrement) |
| `GET` | `/api/orders/[id]` | owner/admin | Order detail |
| `PUT` | `/api/orders/[id]` | admin | Update order status |
| `GET` | `/api/admin/orders` | admin | All orders + customer info |
| `GET` | `/api/admin/users` | admin | All users + order counts |
| `GET` | `/api/users/me` | user | Profile |
| `PUT` | `/api/users/me` | user | Update profile |

### Example: list electronics under $200
```bash
curl "http://localhost:3000/api/products?category=electronics&maxPrice=200&sort=price_asc"
```
### Example: place an order (auth required)
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -b "next-auth.session-token=<YOUR_JWT>" \
  -d '{
    "items": [{"productId":"<id>","quantity":1}],
    "shipping": {"name":"Jane","email":"jane@x.com","phone":"555","address":"1 Main","city":"Springfield","state":"IL","zip":"62704","country":"United States"},
    "paymentMethod":"cod"
  }'
```

---

## 🔒 Security Notes

- **Password hashing:** Node `crypto.scrypt` with a per-user random salt; constant-time comparison.
- **JWT auth:** NextAuth JWT strategy; the `role` is embedded in the token and surfaced on the session.
- **Protected routes:** API handlers use `requireUser()` / `requireAdmin()` guards returning 401/403.
- **Input validation:** Zod schemas on every mutating endpoint; 422 responses with field errors.
- **Atomicity:** Order creation runs in a Prisma transaction that also decrements product stock (guarded against going negative).
- **Secrets:** `NEXTAUTH_SECRET` and `DATABASE_URL` come from env, never committed for production.
- **CORS:** Same-origin API + NextAuth cookie credentials; safe by default in the App Router.

---

## ☁️ Deployment

### Option A — Vercel (recommended for Next.js)
1. Push the repo to GitHub (see below).
2. Import the project in [Vercel](https://vercel.com/new) — it auto-detects Next.js.
3. Add environment variables in the Vercel dashboard:
   - `NEXTAUTH_SECRET` → a fresh `openssl rand -base64 32` value.
   - `NEXTAUTH_URL` → `https://your-domain.vercel.app`.
   - `DATABASE_URL` → a production DB. For a quick demo, Vercel Postgres or
     any external Postgres works with a one-line Prisma provider change
     (`sqlite` → `postgresql`). For SQLite-based demos, use a persistent
     volume or switch to Postgres/MySQL.
4. Run the build (Vercel does it automatically). Run `bun run db:push` +
   `bun run db:seed` against your production DB once (via a Vercel build hook
   or a one-off script).

### Option B — Self-host (Node server)
```bash
bun run build      # creates .next/standalone
bun run start      # NODE_ENV=production bun .next/standalone/server.js
```
Put it behind a reverse proxy (Caddy/Nginx) with TLS, and set the env vars.

---

## 🐙 Uploading to GitHub

```bash
# from the project root
git init
git add .
git commit -m "feat: ShopSphere full-stack e-commerce"
git branch -M main
git remote add origin https://github.com/<your-username>/shopsphere.git
git push -u origin main
```
Make sure `.gitignore` excludes `node_modules/`, `.next/`, `db/custom.db`,
and `.env` (keep `.env.example` committed). A starter `.gitignore` for
Next.js covers this.

---

## 🛠️ Useful Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Start the dev server on port 3000 |
| `bun run lint` | Run ESLint |
| `bun run build` | Production build (standalone output) |
| `bun run start` | Run the production server |
| `bun run db:push` | Push the Prisma schema to the DB |
| `bun run db:generate` | Regenerate the Prisma client |
| `bun run db:seed` | Seed demo data (admin + customer + 55 products) |
| `bun run db:reset` | Reset migrations (destructive) |
| `bun run gen:images` | Regenerate the premium product images into `/public/products` (resumable; supports `SHARD_INDEX`/`SHARD_COUNT` for parallelism) |

---

## 📝 Notes & Design Decisions

- **Single-route SPA.** The storefront is a single-route app (`/`) that swaps
  views via a small Zustand store. This keeps the demo self-contained; each
  view is still a clean, component-based module under `src/views/`.
- **Cart persistence.** The cart lives in Zustand with `localStorage`
  persistence (`shopsphere-cart`), so it survives reloads and isn’t coupled
  to auth.
- **Imagery.** Products use curated Unsplash photo URLs with a deterministic
  `picsum.photos` fallback (via `<ProductImage>`) so the UI never shows a
  broken image.
- **Currency/formatting.** USD via `Intl.NumberFormat`; tax is 8%, free
  shipping over $75, otherwise $6.99 — kept in `src/lib/constants.ts`.

---

## 📄 License

Free to use as a learning reference. Product imagery is originally generated for ShopSphere.

---

### ✅ Verification
The full golden path (home → browse → cart → checkout → order → account →
admin) was verified end-to-end with a headless browser agent against the live
dev server — all checks passed with zero console errors.
