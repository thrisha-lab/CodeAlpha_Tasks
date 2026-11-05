"use client";

import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  ArrowLeft,
  Lock,
} from "lucide-react";

import { useUIStore } from "@/store/ui-store";
import { useCartStore } from "@/store/cart-store";
import { EmptyState } from "@/components/storefront/empty-state";
import { ProductImage } from "@/components/storefront/product-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import {
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
} from "@/lib/constants";

export default function CartView() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const clear = useCartStore((s) => s.clear);
  const navigate = useUIStore((s) => s.navigate);

  const itemsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingTotal =
    itemsTotal >= FREE_SHIPPING_THRESHOLD || itemsTotal === 0
      ? 0
      : SHIPPING_FLAT;
  const taxTotal = Math.round(itemsTotal * TAX_RATE * 100) / 100;
  const total = Math.round((itemsTotal + shippingTotal + taxTotal) * 100) / 100;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Browse our catalog and add something you love."
          action={
            <Button onClick={() => navigate("products")}>
              <ShoppingCart size={16} />
              Browse products
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Shopping cart
      </h1>

      <div className="mt-6 grid lg:grid-cols-[1fr_380px] gap-8">
        {/* Left: items list */}
        <Card className="gap-0 py-0 overflow-hidden">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-sm font-semibold">
              {items.length} {items.length === 1 ? "item" : "items"}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={16} />
              Clear cart
            </Button>
          </div>

          <div className="px-3 sm:px-4">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex gap-4 py-4 border-b last:border-0"
              >
                <button
                  type="button"
                  onClick={() => navigate("product", { id: item.productId })}
                  className="shrink-0"
                  aria-label={`View ${item.name}`}
                >
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    fallbackSeed={item.slug}
                    className="h-20 w-20 rounded-lg border object-cover"
                  />
                </button>

                <div className="flex flex-1 min-w-0 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate("product", { id: item.productId })
                      }
                      className="text-left text-sm font-semibold leading-snug hover:text-primary line-clamp-2"
                    >
                      {item.name}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeItem(item.productId)}
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.price)} each
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-md border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-r-none"
                        onClick={() => decrement(item.productId)}
                        disabled={item.quantity <= 1}
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus size={14} />
                      </Button>
                      <input
                        type="number"
                        min={1}
                        max={item.stock || 99}
                        value={item.quantity}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!Number.isNaN(v)) {
                            setQuantity(item.productId, v);
                          }
                        }}
                        aria-label={`Quantity for ${item.name}`}
                        className="h-8 w-12 border-x bg-transparent text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-l-none"
                        onClick={() => increment(item.productId)}
                        disabled={item.quantity >= (item.stock || 99)}
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>

                    <span className="text-sm font-semibold">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right: order summary */}
        <div className="lg:sticky lg:top-24 self-start">
          <Card>
            <div className="px-6">
              <h2 className="text-base font-semibold">Order summary</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Estimates shown — final totals are confirmed at checkout.
              </p>
            </div>

            <div className="mt-4 px-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(itemsTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estimated shipping</span>
                <span className="font-medium">
                  {shippingTotal === 0 ? (
                    <span className="text-primary">FREE</span>
                  ) : (
                    formatCurrency(shippingTotal)
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Estimated tax (8%)
                </span>
                <span className="font-medium">{formatCurrency(taxTotal)}</span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="font-semibold">Estimated total</span>
                <span className="text-lg font-bold">{formatCurrency(total)}</span>
              </div>

              {itemsTotal > 0 && itemsTotal < FREE_SHIPPING_THRESHOLD && (
                <p className="text-xs text-muted-foreground">
                  Add{" "}
                  {formatCurrency(FREE_SHIPPING_THRESHOLD - itemsTotal)}{" "}
                  more to qualify for free shipping.
                </p>
              )}
            </div>

            <div className="mt-6 px-6 flex flex-col gap-2">
              <Button
                size="lg"
                onClick={() => navigate("checkout")}
                className="w-full"
              >
                Proceed to checkout
                <ArrowRight size={16} />
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("products")}
                className="w-full"
              >
                <ArrowLeft size={16} />
                Continue shopping
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock size={12} />
                Secure checkout
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
