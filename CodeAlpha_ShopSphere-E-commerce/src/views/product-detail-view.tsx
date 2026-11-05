"use client";

import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Minus,
  Plus,
  Truck,
  RefreshCw,
  ShieldCheck,
  ChevronLeft,
  Star,
  Heart,
  Check,
  PackageX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/storefront/product-card";
import { ProductImage } from "@/components/storefront/product-image";
import { RatingStars } from "@/components/storefront/rating-stars";
import { EmptyState } from "@/components/storefront/empty-state";

import { useProduct, useRelatedProducts } from "@/hooks/use-products";
import { useUIStore } from "@/store/ui-store";
import { useCartStore } from "@/store/cart-store";
import { formatCurrency, clamp } from "@/lib/format";
import { STORE_NAME, FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import type { ProductDTO } from "@/types";

export default function ProductDetailView() {
  const route = useUIStore((s) => s.route);
  const navigate = useUIStore((s) => s.navigate);
  const addItem = useCartStore((s) => s.addItem);
  const id = route.params.id;

  const { data: product, isLoading, isError } = useProduct(id);

  // Local UI state. Reset whenever the product identity changes so
  // navigating from one product to another doesn't leak the previous
  // gallery selection, quantity, or wishlist toggle.
  const [activeImage, setActiveImage] = useState<string>(product?.image ?? "");
  const [qty, setQty] = useState(1);
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    // Reset local UI state when the displayed product changes (legitimate sync).
    /* eslint-disable react-hooks/set-state-in-effect */
    setActiveImage(product?.image ?? "");
    setQty(1);
    setFavorited(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [product?.id, product?.image]);

  // ── Loading skeleton ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
          <div className="aspect-square animate-pulse rounded-2xl bg-muted" />
          <div className="flex flex-col gap-4">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-9 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-10 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-5 w-1/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-12 w-full animate-pulse rounded-full bg-muted" />
            <div className="h-12 w-full animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error / not found ─────────────────────────────────────────
  if (isError || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={PackageX}
          title="Product not found"
          description={`We couldn't find this product at ${STORE_NAME}. It may have been removed or never existed.`}
          action={
            <Button onClick={() => navigate("products")}>Back to shop</Button>
          }
        />
      </div>
    );
  }

  // ── Found ─────────────────────────────────────────────────────
  const outOfStock = product.stock <= 0;
  const lowStock = product.stock > 0 && product.stock <= 5;
  const images = Array.from(new Set([product.image, ...product.images]));
  const showThumbnails = images.length > 1;
  const maxQty = Math.max(1, product.stock);
  // Guard against stale state during cross-product navigation: if the
  // stored activeImage isn't part of the current product's image set
  // (e.g. right after switching products but before the reset effect
  // flushes), fall back to the primary image so the gallery never
  // shows a wrong/empty picture.
  const safeActive = images.includes(activeImage) ? activeImage : product.image;

  function handleAddToCart() {
    if (outOfStock) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: product.image,
        stock: product.stock,
      },
      qty,
    );
    toast.success(`${product.name} added to cart`);
  }

  function handleBuyNow() {
    if (outOfStock) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: product.image,
        stock: product.stock,
      },
      qty,
    );
    toast.success(`${product.name} added to cart`);
    navigate("cart");
  }

  function handleQty(delta: number) {
    setQty((prev) => clamp(prev + delta, 1, maxQty));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb + back */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
          <button
            type="button"
            onClick={() => navigate("home")}
            className="transition-colors hover:text-foreground"
          >
            Home
          </button>
          <span className="mx-1.5">/</span>
          <button
            type="button"
            onClick={() => navigate("products")}
            className="transition-colors hover:text-foreground"
          >
            Products
          </button>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("products")}
          className="gap-1"
        >
          <ChevronLeft size={16} />
          Back
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        {/* Left: gallery */}
        <div className="flex flex-col gap-4">
          <div className="aspect-square overflow-hidden rounded-2xl border bg-muted">
            <ProductImage
              src={safeActive}
              alt={product.name}
              fallbackSeed={product.slug}
              className="h-full w-full rounded-2xl object-cover"
            />
          </div>
          {showThumbnails && (
            <div className="flex flex-wrap gap-3">
              {images.map((img, idx) => {
                const active = img === safeActive;
                return (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    aria-label={`View image ${idx + 1}`}
                    aria-pressed={active}
                    className={`size-18 overflow-hidden rounded-lg border bg-muted transition ${
                      active
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "hover:border-primary/40"
                    }`}
                  >
                    <ProductImage
                      src={img}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      fallbackSeed={`${product.slug}-${idx}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: info */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {product.brand}
            </span>
            <button
              type="button"
              onClick={() =>
                navigate("products", { category: product.category.slug })
              }
              className="text-sm font-medium text-primary transition-colors hover:underline"
            >
              {product.category.name}
            </button>
          </div>

          <h1 className="text-2xl font-bold md:text-3xl">{product.name}</h1>

          <div className="flex items-center gap-2">
            <RatingStars rating={product.rating} />
            <span className="text-xs text-muted-foreground">
              ({product.numReviews} reviews)
            </span>
          </div>

          <div className="text-3xl font-bold text-foreground">
            {formatCurrency(product.price)}
          </div>

          {/* Stock badge */}
          <div>
            {outOfStock ? (
              <Badge className="bg-destructive/10 text-destructive">
                Out of stock
              </Badge>
            ) : lowStock ? (
              <Badge className="bg-warm/15 text-warm">
                Only {product.stock} left
              </Badge>
            ) : (
              <Badge className="bg-primary/10 text-primary">
                <Check size={12} />
                In stock
              </Badge>
            )}
          </div>

          <p className="leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          {/* Quantity selector */}
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-full border">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="m-1 rounded-full"
                onClick={() => handleQty(-1)}
                disabled={outOfStock || qty <= 1}
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </Button>
              <span className="min-w-10 text-center text-sm font-semibold tabular-nums">
                {qty}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="m-1 rounded-full"
                onClick={() => handleQty(1)}
                disabled={outOfStock || qty >= product.stock}
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">
              {outOfStock ? "Unavailable" : `${product.stock} available`}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={outOfStock}
            >
              <ShoppingCart className="size-[18px]" />
              Add to cart
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={handleBuyNow}
              disabled={outOfStock}
            >
              Buy now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="sm:px-3"
              onClick={() => {
                setFavorited((f) => !f);
                toast.success(
                  favorited ? "Removed from wishlist" : "Added to wishlist",
                );
              }}
              aria-label="Toggle wishlist"
              aria-pressed={favorited}
            >
              <Heart
                className={
                  favorited ? "size-[18px] fill-warm text-warm" : "size-[18px]"
                }
              />
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-2 grid grid-cols-3 gap-3 border-t pt-4">
            <TrustBadge
              icon={Truck}
              title="Free shipping"
              subtitle={`Over $${FREE_SHIPPING_THRESHOLD}`}
            />
            <TrustBadge
              icon={RefreshCw}
              title="30-day returns"
              subtitle="Hassle-free"
            />
            <TrustBadge
              icon={ShieldCheck}
              title="Secure checkout"
              subtitle="Encrypted"
            />
          </div>

          {/* Accordion */}
          <Accordion
            type="single"
            collapsible
            defaultValue="shipping"
            className="mt-4"
          >
            <AccordionItem value="shipping">
              <AccordionTrigger>Shipping &amp; returns</AccordionTrigger>
              <AccordionContent className="space-y-2 text-muted-foreground">
                <p>
                  Enjoy free standard shipping on orders over{" "}
                  {formatCurrency(FREE_SHIPPING_THRESHOLD)}. Orders are
                  processed within 1–2 business days and typically arrive in
                  3–5 business days.
                </p>
                <p>
                  Changed your mind? Return any unused item within 30 days for
                  a full refund. Items must be in original condition with tags
                  attached.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="reviews">
              <AccordionTrigger>Reviews ({product.numReviews})</AccordionTrigger>
              <AccordionContent className="space-y-3 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex items-center" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < Math.round(product.rating)
                            ? "fill-warm text-warm"
                            : "text-muted-foreground/40"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {product.rating.toFixed(1)} out of 5
                  </span>
                </div>
                <p>
                  Be the first to share your thoughts on {product.name}. Your
                  review helps other shoppers make confident choices.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Related products */}
      <RelatedProducts product={product} />
    </div>
  );
}

// ── Local helper components (kept inside this view per contract) ──

function TrustBadge({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon size={18} />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
    </div>
  );
}

function RelatedProducts({ product }: { product: ProductDTO }) {
  const { data, isLoading } = useRelatedProducts(product, 4);
  const related = data?.data ?? [];

  if (isLoading) {
    return (
      <section className="mt-16">
        <h2 className="mb-6 text-xl font-bold">You may also like</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (related.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="mb-6 text-xl font-bold">You may also like</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
