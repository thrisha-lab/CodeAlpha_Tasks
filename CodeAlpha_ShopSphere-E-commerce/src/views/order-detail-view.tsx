"use client";

import { useEffect } from "react";
import {
  PackageX,
  ChevronLeft,
  Check,
  MapPin,
  CreditCard,
  Loader2,
  ClipboardList,
} from "lucide-react";

import { useUIStore } from "@/store/ui-store";
import { useAuth } from "@/hooks/use-auth";
import { useOrder } from "@/hooks/use-products";

import { EmptyState } from "@/components/storefront/empty-state";
import { ProductImage } from "@/components/storefront/product-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { formatCurrency, formatDateTime } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import type { OrderDTO, OrderStatus } from "@/types";

const ACTIVE_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
];

export default function OrderDetailView() {
  const { isAuthenticated } = useAuth();
  const navigate = useUIStore((s) => s.navigate);
  const route = useUIStore((s) => s.route);
  const id = route.params.id;
  const { data: order, isLoading } = useOrder(id);

  // Redirect unauthenticated users (never call navigate during render).
  useEffect(() => {
    if (!isAuthenticated) navigate("login");
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null; // redirecting

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <EmptyState
          icon={PackageX}
          title="Order not found"
          description="We couldn’t find the order you’re looking for. It may have been removed or the link is incorrect."
          action={
            <Button variant="outline" onClick={() => navigate("orders")}>
              <ChevronLeft className="size-4" />
              Back to orders
            </Button>
          }
        />
      </div>
    );
  }

  const shortId = (id ?? order.id).slice(0, 8);
  const currentIndex = ACTIVE_STATUSES.indexOf(order.status);
  const isCancelled = order.status === "cancelled";
  const itemCount = order.items.reduce((n, it) => n + it.quantity, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => navigate("orders")}
        className="mb-4 -ml-2"
      >
        <ChevronLeft className="size-4" />
        Back to orders
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Order #{shortId}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {formatDateTime(order.createdAt)}
          </p>
        </div>
        <span
          className={
            "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium " +
            (isCancelled
              ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
              : "bg-primary/10 text-primary")
          }
        >
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {/* status timeline / cancellation alert */}
      {isCancelled ? (
        <Alert variant="destructive" className="mb-6">
          <PackageX />
          <AlertTitle>This order was cancelled.</AlertTitle>
          <AlertDescription>
            The items were not shipped and you were not charged. If you have
            questions, please contact support.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-6 mb-6">
          <div className="overflow-x-auto nice-scroll">
            <div className="flex items-start justify-between min-w-[480px]">
              {ACTIVE_STATUSES.map((status, idx) => {
                const achieved = idx <= currentIndex;
                const isLast = idx === ACTIVE_STATUSES.length - 1;
                const connectorAfterAchieved = idx < currentIndex;
                return (
                  <div
                    key={status}
                    className="flex-1 flex flex-col items-center text-center"
                  >
                    <div className="flex items-center w-full">
                      {/* left connector line */}
                      <div
                        className={
                          "flex-1 h-0.5 " +
                          (idx === 0
                            ? "bg-transparent"
                            : achieved
                              ? "bg-primary"
                              : "bg-muted")
                        }
                      />
                      {/* node */}
                      <div
                        className={
                          "size-9 rounded-full flex items-center justify-center shrink-0 transition-colors " +
                          (achieved
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground")
                        }
                      >
                        <Check className="size-5" />
                      </div>
                      {/* right connector line */}
                      <div
                        className={
                          "flex-1 h-0.5 " +
                          (isLast
                            ? "bg-transparent"
                            : connectorAfterAchieved
                              ? "bg-primary"
                              : "bg-muted")
                        }
                      />
                    </div>
                    <div
                      className={
                        "mt-2 text-xs font-medium " +
                        (achieved ? "text-primary" : "text-muted-foreground")
                      }
                    >
                      {ORDER_STATUS_LABEL[status]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* shipping + payment/summary grid */}
      <div className="grid md:grid-cols-[1fr_1fr] gap-6 mb-6">
        {/* shipping address */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4 text-primary" />
              Shipping address
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <div className="font-medium">{order.shipping.name}</div>
            <div className="text-muted-foreground break-all">
              {order.shipping.email}
            </div>
            {order.shipping.phone && (
              <div className="text-muted-foreground">{order.shipping.phone}</div>
            )}
            <div className="pt-2 text-muted-foreground">
              {order.shipping.address}
            </div>
            <div className="text-muted-foreground">
              {order.shipping.city}, {order.shipping.state} {order.shipping.zip}
            </div>
            <div className="text-muted-foreground">{order.shipping.country}</div>
          </CardContent>
        </Card>

        {/* payment + summary */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4 text-primary" />
              Payment &amp; summary
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payment method</span>
              <span className="font-medium">{order.paymentMethod}</span>
            </div>
            <div className="border-t pt-3 space-y-1.5">
              <SummaryRow
                label={`Items (${itemCount})`}
                value={formatCurrency(order.itemsTotal)}
              />
              <SummaryRow
                label="Shipping"
                value={
                  order.shippingTotal === 0
                    ? "FREE"
                    : formatCurrency(order.shippingTotal)
                }
                highlight={order.shippingTotal === 0}
              />
              <SummaryRow
                label="Tax"
                value={formatCurrency(order.taxTotal)}
              />
              <div className="flex items-center justify-between pt-2 mt-2 border-t font-semibold">
                <span>Total</span>
                <span className="text-primary">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* items list */}
      <Card className="shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4 text-primary" />
            Items ({order.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-4 rounded-lg border bg-card/50 p-2 sm:p-3"
            >
              <ProductImage
                src={it.image}
                alt={it.name}
                fallbackSeed={it.productId}
                className="h-16 w-16 rounded-lg border bg-muted object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{it.name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(it.price)} × {it.quantity}
                </div>
              </div>
              <div className="font-medium shrink-0 text-right">
                {formatCurrency(it.price * it.quantity)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Order placed {formatDateTime(order.createdAt)} · Last updated{" "}
        {formatDateTime(order.updatedAt)}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-medium text-primary" : ""}>
        {value}
      </span>
    </div>
  );
}
