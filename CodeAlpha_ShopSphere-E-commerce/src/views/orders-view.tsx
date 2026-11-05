"use client";

import { useEffect } from "react";
import { Package, ChevronRight } from "lucide-react";

import { useUIStore } from "@/store/ui-store";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-products";

import { EmptyState } from "@/components/storefront/empty-state";
import { ProductImage } from "@/components/storefront/product-image";
import { Button } from "@/components/ui/button";

import { formatCurrency, formatDate } from "@/lib/format";
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from "@/lib/constants";
import type { OrderDTO } from "@/types";

export default function OrdersView() {
  const { isAuthenticated } = useAuth();
  const navigate = useUIStore((s) => s.navigate);
  const { data, isLoading } = useOrders();

  // Redirect unauthenticated users (never call navigate during render).
  useEffect(() => {
    if (!isAuthenticated) navigate("login");
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null; // redirecting

  const orders: OrderDTO[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track and review the orders you&apos;ve placed.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-muted rounded-xl h-32"
              aria-hidden
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="When you place an order it will show up here."
          action={
            <Button onClick={() => navigate("products")}>Start shopping</Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: OrderDTO }) {
  const navigate = useUIStore((s) => s.navigate);

  const itemCount = order.items.reduce((n, it) => n + it.quantity, 0);
  const visibleItems = order.items.slice(0, 3);
  const moreCount = Math.max(0, order.items.length - visibleItems.length);
  const shortId = order.id.slice(0, 8);

  function open() {
    navigate("order", { id: order.id });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className="group rounded-xl border bg-card shadow-sm p-4 sm:p-5 cursor-pointer transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring card-lift"
    >
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">Order #{shortId}</div>
          <div className="mt-0.5 text-sm text-muted-foreground">
            {formatDate(order.createdAt)}
          </div>
        </div>
        <span
          className={
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
            (ORDER_STATUS_COLOR[order.status] ??
              "bg-muted text-muted-foreground")
          }
        >
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {/* thumbnails */}
      {visibleItems.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          {visibleItems.map((it) => (
            <ProductImage
              key={it.id}
              src={it.image}
              alt={it.name}
              fallbackSeed={it.productId}
              className="h-14 w-14 rounded-lg border bg-muted object-cover"
            />
          ))}
          {moreCount > 0 && (
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-lg border bg-muted text-xs font-medium text-muted-foreground">
              +{moreCount}
            </div>
          )}
        </div>
      )}

      {/* footer */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-medium">{itemCount}</span>{" "}
          <span className="text-muted-foreground">
            {itemCount === 1 ? "item" : "items"} ·{" "}
          </span>
          <span className="font-semibold text-primary">
            {formatCurrency(order.total)}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
        >
          View details
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
