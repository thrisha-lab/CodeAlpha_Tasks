# ShopSphere — Frontend View Contract (READ BEFORE WRITING CODE)

This document is the **single source of truth** for building ShopSphere's
client-side views. Read it fully, then read `/home/z/my-project/worklog.md`
for context on prior work, then write ONLY the files assigned to your task.

The app is a **single-route SPA** living entirely on `/`. There is no
Next.js routing beyond `/`. Navigation between "pages" happens through a
Zustand UI store. The router lives in `src/app/page.tsx` (already wired by the
orchestrator). Your job is to build individual **view components** that the
router imports.

---

## 1. Tech & conventions

- React 19 + Next.js 16 (App Router), TypeScript strict.
- Styling: **Tailwind CSS v4** + **shadcn/ui** (New York). All shadcn components
  already exist under `src/components/ui/` — import from `@/components/ui/...`.
- Icons: `lucide-react` (`import { ShoppingCart } from "lucide-react"`).
- Every view is a **`"use client"`** component with a **default export**.
- File naming: `src/views/<name>-view.tsx`. Admin views live in
  `src/views/admin/`.
- **Do NOT create new shared components, hooks, or lib files.** Reuse what
  already exists (see §4). If you truly need something, add it as a small local
  helper inside your own view file.

## 2. Theme rules (MANDATORY)

- Brand primary = **emerald** (already mapped to `--primary` / `--brand`).
  Use `bg-primary`, `text-primary`, `bg-primary/10`, `text-primary-foreground`.
- Warm accent = **amber** (`--warm`). Use `bg-warm`, `text-warm`,
  `text-warm-foreground` for sale tags, ratings, "new" badges, highlights.
- **NEVER use indigo or blue.** Use `bg-background`, `text-foreground`,
  `bg-muted`, `text-muted-foreground`, `bg-card`, `border-border` for neutrals.
- Cards: `rounded-xl border bg-card shadow-sm`.
- Buttons: use the `Button` component with variants `default` (primary),
  `outline`, `secondary`, `ghost`, `destructive`. Sizes: `sm`, `default`,
  `lg`, `icon`.
- Responsive: **mobile-first**. Use `sm:`, `md:`, `lg:` breakpoints. Touch
  targets ≥ 36px.
- Use the utility classes already in `globals.css`: `card-lift`, `bg-mesh`,
  `text-gradient`, `nice-scroll`.

## 3. Navigation & state

```ts
import { useUIStore } from "@/store/ui-store";
import type { RouteName } from "@/store/ui-store";

const navigate = useUIStore((s) => s.navigate);
const route = useUIStore((s) => s.route);
// route.name: "home" | "products" | "product" | "cart" | "checkout" |
//   "order-success" | "orders" | "order" | "profile" | "login" | "register" |
//   "admin"
// route.params: Record<string,string>  e.g. { id }, { q, category, sort,
//   minPrice, maxPrice, page, isNew, featured }, { tab }

navigate("products", { q: "headphones" });
navigate("product", { id: product.id });
navigate("cart");
```

`navigate` also scrolls to top. **Do not use `next/link` hrefs** for in-app
navigation — use buttons with `onClick={() => navigate(...)}`. (You may still
import `Link` if absolutely needed, but it is not required anywhere.)

Cart state:
```ts
import { useCartStore } from "@/store/cart-store";
// items: CartItem[] (productId, name, slug, price, image, quantity, stock)
// addItem(item, qty?), removeItem(productId), setQuantity(productId, qty),
// increment(productId), decrement(productId), clear(), count(), subtotal()
```

Auth:
```ts
import { useAuth } from "@/hooks/use-auth";
const { user, isAuthenticated, isAdmin, login, register, logout } = useAuth();
// login(email, password) => Promise; throws on error.
// register(name, email, password) => Promise; auto-signs in.
// For protected views: if (!isAuthenticated) { navigate("login"); return null; }
//   Use a useEffect for the redirect to avoid calling navigate during render.
```

## 4. Reusable pieces (DO NOT recreate these)

Shared components (`@/components/storefront/`):
- `ProductCard` ({ product: ProductDTO }) — clickable card w/ add-to-cart.
- `ProductCardSkeleton` — loading placeholder.
- `ProductImage` ({ src, alt, fallbackSeed?, className?, ...imgProps }) —
  `<img>` with auto picsum fallback. Always set `fallbackSeed={product.slug}`.
- `RatingStars` ({ rating, size?, showValue?, count? }).
- `EmptyState` ({ icon: LucideIcon, title, description?, action?, className? }).
- `Header`, `Footer` — rendered by the app shell, NOT by views.

Hooks (`@/hooks/`):
- `useProducts(query)` → `{ data: ProductListResponse, isLoading, isError }`
- `useProduct(idOrSlug)` → `{ data: ProductDTO, isLoading, isError }`
- `useFeaturedProducts()` → `{ data: { data: ProductDTO[] } }`
- `useNewProducts()` → `{ data: { data: ProductDTO[] } }`
- `useCategories()` → `{ data: { data: CategoryDTO[] } }`
- `useRelatedProducts(product, limit=4)` → `{ data: { data: ProductDTO[] } }`
- `useOrders()` → `{ data: { data: OrderDTO[] } }`
- `useOrder(id)` → `{ data: OrderDTO }`
- `useCreateOrder()` → mutation, call `.mutate({ items, shipping, paymentMethod })`,
  `.mutateAsync(...)` returns the OrderDTO. On success it clears the cart.
- `useCreateProduct()`, `useUpdateProduct(id)`, `useDeleteProduct()`,
  `useCreateCategory()` — admin mutations (invalidate + toast automatically).
- `useAdminOrders()` → `{ data: { data: AdminOrderDTO[] } }` where each order
  also has `user: { id, name, email }`.
- `useAdminUsers()` → `{ data: { data: AdminUserDTO[] } }`.
- `useUpdateOrderStatus()` → `.mutate({ id, status })`.
- `useUpdateProfile()` → `.mutate({ name?, phone? })`.
- `useAuth()` (see §3).

Lib:
- `@/lib/format`: `formatCurrency(n)`, `formatDate(iso)`, `formatDateTime(iso)`,
  `slugify(s)`, `clamp(n,min,max)`, `truncate(text, max)`.
- `@/lib/constants`: `STORE_NAME`, `STORE_TAGLINE`, `CURRENCY`, `TAX_RATE`
  (0.08), `FREE_SHIPPING_THRESHOLD` (75), `SHIPPING_FLAT` (6.99),
  `ORDER_STATUSES` (array), `ORDER_STATUS_LABEL` (map),
  `ORDER_STATUS_COLOR` (map → tailwind classes for badges),
  `SORT_OPTIONS` (array of {value,label}), `DEMO_ADMIN` ({email,password}),
  `DEMO_CUSTOMER`, `PRODUCT_PAGE_SIZE` (12).
- `@/lib/api`: `api` (fetch wrapper), `HttpError`. You usually don't need this
  directly — use hooks.

Types (`@/types`): `ProductDTO`, `CategoryDTO`, `OrderDTO`, `OrderItemDTO`,
`OrderStatus`, `ShippingInfo`, `CartItem`, `ProductListResponse`,
`ProductsQuery`, `UserDTO`.

## 5. Toasts & feedback

```ts
import { toast } from "sonner";
toast.success("Added to cart");
toast.error("Could not place order");
```
A `<Toaster />` is already mounted globally. **Do not add another.**

Loading: use `ProductCardSkeleton` for product grids; use the `Skeleton`
component (`@/components/ui/skeleton`) for other loading states. Show a
disabled + `Loader2` spinner on submit buttons during mutations:
```ts
import { Loader2 } from "lucide-react";
{isPending && <Loader2 className="animate-spin" />}
```

## 6. Layout rules

- The app shell wraps views in `<main className="flex-1 ...">` inside a
  `min-h-screen flex flex-col` container with `<Header/>` + `<Footer/>`. Your
  view returns only its content (no `<html>`, no header/footer, no main wrapper
  required, but you MAY use a `<section>`/`<div>` for spacing). Use
  `mx-auto max-w-7xl px-4 sm:px-6 py-8` for the page container inside your view.
- 404 / empty / error states must be handled explicitly (use `EmptyState`).

## 7. Forms & validation

- Simple forms: controlled `useState` + manual validation is fine.
- Complex forms (checkout, admin product form): use `react-hook-form` +
  `@hookform/resolvers/zod` + `zod` (all installed). Use the shadcn `Form`
  components from `@/components/ui/form` if you want.
- Show inline field errors (red text via `text-destructive`) and use
  `toast.error` for submit errors. Mutations already toast on error; you can
  also show inline.

## 8. Per-view specs

See your task assignment for the exact file(s) and behavior expected. Each
view must:
- Handle loading (`isLoading`), error (`isError`), empty states.
- Be fully responsive (mobile + tablet + desktop).
- Use the brand/warm color system, no indigo/blue.
- Default-export its top-level component.

## 9. Worklog (MANDATORY)

After finishing, **append** a section to `/home/z/my-project/worklog.md`
starting with `---`, including Task ID, Agent, Task, Work Log, Stage Summary.
Do not overwrite existing content. Note any deviations or follow-ups needed.
