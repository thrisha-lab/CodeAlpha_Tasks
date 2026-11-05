"use client";

import {
  CheckCircle2,
  Loader2,
  PackageX,
  ArrowRight,
} from "lucide-react";

import { useUIStore } from "@/store/ui-store";
import { useOrder } from "@/hooks/use-products";
import { EmptyState } from "@/components/storefront/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_COLOR,
} from "@/lib/constants";

export default function OrderSuccessView() {
  const route = useUIStore((s) => s.route);
  const navigate = useUIStore((s) => s.navigate);
  const id = route.params.id;
  const { data: order, isLoading } = useOrder(id);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order && !isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <EmptyState
          icon={PackageX}
          title="Order not found"
          description="We couldn't find this order. It may have been removed, or the link is invalid."
          action={
            <Button onClick={() => navigate("home")}>Back to home</Button>
          }
        />
      </div>
    );
  }

  const shortId = order!.id.slice(0, 8).toUpperCase();
  const itemsCount = order!.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <section className="bg-mesh">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
        <div className="flex justify-center">
          <CheckCircle2 className="size-16 text-primary" />
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          Thank you for your order!
        </h1>

        <p className="mt-3 text-muted-foreground">
          Your order{" "}
          <span className="font-semibold text-foreground">#{shortId}</span>{" "}
          has been placed successfully. A confirmation email is on its way.
        </p>

        <Card className="mt-8 text-left">
          <div className="px-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Order number
                </p>
                <p className="mt-1 font-semibold">#{shortId}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Order date
                </p>
                <p className="mt-1 font-semibold">
                  {formatDate(order!.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <span
                  className={cn(
                    "mt-1 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                    ORDER_STATUS_COLOR[order!.status] ??
                      "bg-muted text-muted-foreground",
                  )}
                >
                  {ORDER_STATUS_LABEL[order!.status] ?? order!.status}
                </span>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Items
                </p>
                <p className="mt-1 font-semibold">
                  {itemsCount} {itemsCount === 1 ? "item" : "items"}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total paid</span>
              <span className="text-xl font-bold">
                {formatCurrency(order!.total)}
              </span>
            </div>
          </div>
        </Card>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={() => navigate("orders")}>
            View my orders
            <ArrowRight size={16} />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("home")}
          >
            Continue shopping
          </Button>
        </div>
      </div>
    </section>
  );
}
