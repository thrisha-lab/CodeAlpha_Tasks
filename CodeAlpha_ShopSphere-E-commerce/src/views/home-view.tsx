"use client";

import {
  Sparkles,
  Truck,
  ShieldCheck,
  RefreshCw,
  Headphones,
  ArrowRight,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/storefront/product-card";
import { ProductImage } from "@/components/storefront/product-image";
import { EmptyState } from "@/components/storefront/empty-state";
import { useUIStore } from "@/store/ui-store";
import {
  useFeaturedProducts,
  useNewProducts,
  useCategories,
} from "@/hooks/use-products";
import { formatCurrency } from "@/lib/format";
import {
  STORE_NAME,
  STORE_TAGLINE,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/constants";
import type { CategoryDTO, ProductDTO } from "@/types";

// ─── Local helpers (kept inside this view per contract §1) ────────────────

const HERO_IMAGES = [
  "/products/category-electronics.png",
  "/products/category-fashion.png",
  "/products/category-home-living.png",
  "/products/category-beauty.png",
];

const TRUST_ITEMS = [
  {
    icon: Truck,
    title: "Free shipping",
    desc: `On orders over ${formatCurrency(FREE_SHIPPING_THRESHOLD)}`,
  },
  { icon: RefreshCw, title: "30-day returns", desc: "Easy & hassle-free" },
  { icon: ShieldCheck, title: "Secure checkout", desc: "Encrypted & private" },
  { icon: Headphones, title: "24/7 support", desc: "Here when you need us" },
];

// Split the tagline so we can gradient-highlight the trailing phrase
// ("modern living"). Degrades gracefully if the constant ever changes.
const TAGLINE_HIGHLIGHT = "modern living";
const [taglineLead, taglineTail] = STORE_TAGLINE.split(TAGLINE_HIGHLIGHT);

function CategoryCardSkeleton() {
  return <div className="aspect-square animate-pulse rounded-xl bg-muted" />;
}

function SectionHeading({
  title,
  subtitle,
  onViewAll,
  viewAllLabel = "View all",
}: {
  title: string;
  subtitle?: string;
  onViewAll: () => void;
  viewAllLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onViewAll}
        className="shrink-0 text-muted-foreground hover:text-primary"
      >
        {viewAllLabel}
        <ArrowRight size={14} />
      </Button>
    </div>
  );
}

// ─── View ────────────────────────────────────────────────────────────────

export default function HomeView() {
  const navigate = useUIStore((s) => s.navigate);

  const {
    data: featuredData,
    isLoading: featuredLoading,
  } = useFeaturedProducts();
  const { data: newData, isLoading: newLoading } = useNewProducts();
  const { data: catData, isLoading: catLoading } = useCategories();

  const categories: CategoryDTO[] = catData?.data ?? [];
  const featured: ProductDTO[] = featuredData?.data ?? [];
  const newArrivals: ProductDTO[] = newData?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-mesh rounded-3xl px-6 py-16 md:px-12 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-warm/15 px-3 py-1 text-xs font-semibold text-warm">
              <Sparkles size={12} />
              New season · 2025
            </span>

            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              {taglineLead}
              <span className="text-gradient">{TAGLINE_HIGHLIGHT}</span>
              {taglineTail}
            </h1>

            <p className="max-w-md text-muted-foreground">
              Welcome to {STORE_NAME} — discover thoughtfully designed products
              that blend quality, style, and value. Fresh drops, fair prices,
              and free shipping on every order over{" "}
              {formatCurrency(FREE_SHIPPING_THRESHOLD)}.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => navigate("products")}>
                Shop now
                <ArrowRight size={16} />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("products", { featured: "true" })}
              >
                Explore featured
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-3">
              <ProductImage
                src={HERO_IMAGES[0]}
                alt="Featured product — headphones"
                fallbackSeed="hero-1"
                className="h-44 w-full rounded-2xl object-cover shadow-sm"
              />
              <ProductImage
                src={HERO_IMAGES[1]}
                alt="Featured product — sneakers"
                fallbackSeed="hero-2"
                className="h-44 w-full rounded-2xl object-cover shadow-sm md:mt-8"
              />
              <ProductImage
                src={HERO_IMAGES[2]}
                alt="Featured product — accessories"
                fallbackSeed="hero-3"
                className="h-44 w-full rounded-2xl object-cover shadow-sm"
              />
              <ProductImage
                src={HERO_IMAGES[3]}
                alt="Featured product — home goods"
                fallbackSeed="hero-4"
                className="h-44 w-full rounded-2xl object-cover shadow-sm"
              />
            </div>

            {/* Floating "Free shipping" pill on the collage */}
            <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur">
              <Truck size={14} className="text-primary" />
              Free shipping
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ────────────────────────────────────────────────── */}
      <section
        aria-label="Why shop with us"
        className="grid grid-cols-2 gap-4 py-10 md:grid-cols-4"
      >
        {TRUST_ITEMS.map((t) => (
          <div
            key={t.title}
            className="flex flex-col items-center gap-3 text-center md:flex-row md:items-center md:gap-4 md:text-left"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <t.icon size={22} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{t.title}</span>
              <span className="text-xs text-muted-foreground">{t.desc}</span>
            </div>
          </div>
        ))}
      </section>

      {/* ── Categories ───────────────────────────────────────────────── */}
      <section className="py-12">
        <SectionHeading
          title="Shop by category"
          subtitle="Browse our curated collections"
          onViewAll={() => navigate("products")}
        />
        {catLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No categories yet"
            description="Check back soon for new collections."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate("products", { category: c.slug })}
                aria-label={`Browse the ${c.name} category`}
                className="card-lift group relative aspect-square overflow-hidden rounded-xl bg-muted text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <ProductImage
                  src={c.image ?? ""}
                  alt={c.name}
                  fallbackSeed={c.slug}
                  className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-8">
                  <span className="text-sm font-semibold text-white">
                    {c.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Featured products ────────────────────────────────────────── */}
      <section className="py-12">
        <SectionHeading
          title="Featured products"
          subtitle="Handpicked favorites our customers love"
          onViewAll={() => navigate("products", { featured: "true" })}
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {featuredLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))
          ) : featured.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={Sparkles}
                title="No featured products"
                description="Check back soon for new highlights."
              />
            </div>
          ) : (
            featured.slice(0, 12).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))
          )}
        </div>
      </section>

      {/* ── Promo banner ─────────────────────────────────────────────── */}
      <section className="relative mt-4 overflow-hidden rounded-3xl border border-primary/15 bg-accent/60 px-8 py-12 md:p-12">
        {/* Decorative blurred emerald + champagne accents */}
        <div className="absolute -right-10 -top-12 size-52 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-12 size-60 rounded-full bg-warm/15 blur-3xl" />

        <div className="relative grid items-center gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-background/70 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
              <Sparkles size={12} /> Limited-time offer
            </span>
            <h3 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Get free shipping on orders over{" "}
              <span className="text-gradient">{formatCurrency(FREE_SHIPPING_THRESHOLD)}</span>
            </h3>
            <p className="max-w-md text-muted-foreground">
              Stock up on your favorites and we&apos;ll cover the delivery. No
              code needed — the discount applies automatically at checkout.
            </p>
          </div>
          <div className="flex md:justify-end">
            <Button
              size="lg"
              onClick={() => navigate("products")}
              className="shadow-sm"
            >
              Start shopping
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </section>

      {/* ── New arrivals ─────────────────────────────────────────────── */}
      <section className="py-12">
        <SectionHeading
          title="New arrivals"
          subtitle="Fresh drops and latest finds"
          onViewAll={() => navigate("products", { isNew: "true" })}
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {newLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))
          ) : newArrivals.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={Sparkles}
                title="No new arrivals"
                description="Check back soon for fresh drops."
              />
            </div>
          ) : (
            newArrivals.slice(0, 12).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
