// App-wide constants for ShopSphere.

export const STORE_NAME = "ShopSphere";
export const STORE_TAGLINE = "Curated goods for modern living";
export const CURRENCY = "USD";
export const CURRENCY_SYMBOL = "$";

// Tax + shipping (kept simple + visible for demo clarity).
export const TAX_RATE = 0.08; // 8%
export const FREE_SHIPPING_THRESHOLD = 75; // USD
export const SHIPPING_FLAT = 6.99; // USD when below threshold

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  processing: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  shipped: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  delivered:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
] as const;

// Demo admin + seeded customer credentials (safe to show in README).
export const DEMO_ADMIN = {
  email: "admin@shopsphere.dev",
  password: "admin123",
};

export const DEMO_CUSTOMER = {
  email: "demo@shopsphere.dev",
  password: "demo123",
};

export const PRODUCT_PAGE_SIZE = 12;
