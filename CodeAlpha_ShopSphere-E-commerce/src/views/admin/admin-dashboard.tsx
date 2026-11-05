"use client";

import {
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { useProducts } from "@/hooks/use-products";
import { useAdminOrders, useAdminUsers } from "@/hooks/use-admin";
import { formatCurrency, formatDate } from "@/lib/format";
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from "@/lib/constants";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/storefront/product-image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tint: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${tint}`}
        >
          <Icon size={22} />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <p className="truncate text-2xl font-semibold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminDashboard() {
  const productsQ = useProducts({ pageSize: 1 });
  const lowStockQ = useProducts({ pageSize: 48 });
  const ordersQ = useAdminOrders();
  const usersQ = useAdminUsers();

  const orders = ordersQ.data?.data ?? [];
  const users = usersQ.data?.data ?? [];
  const lowStockProducts = (lowStockQ.data?.data ?? []).filter(
    (p) => p.stock <= 5,
  );

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="Products"
          value={String(productsQ.data?.total ?? 0)}
          tint="bg-primary/10 text-primary"
          loading={productsQ.isLoading}
        />
        <StatCard
          icon={ShoppingBag}
          label="Orders"
          value={String(orders.length)}
          tint="bg-warm/15 text-warm"
          loading={ordersQ.isLoading}
        />
        <StatCard
          icon={Users}
          label="Users"
          value={String(users.length)}
          tint="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
          loading={usersQ.isLoading}
        />
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={formatCurrency(totalRevenue)}
          tint="bg-primary/10 text-primary"
          loading={ordersQ.isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp size={18} className="text-primary" />
              Recent orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ordersQ.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No orders yet.
              </p>
            ) : (
              <div className="overflow-x-auto nice-scroll">
                <Table className="min-w-[480px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">
                          {shortId(o.id)}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate">
                          {o.user?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(o.createdAt)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(o.total)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${ORDER_STATUS_COLOR[o.status] ?? ""} border-transparent`}
                          >
                            {ORDER_STATUS_LABEL[o.status] ?? o.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package size={18} className="text-warm" />
              Low stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockQ.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : lowStockProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                All products well stocked.
              </p>
            ) : (
              <ul className="divide-y">
                {lowStockProducts.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 py-2"
                  >
                    <ProductImage
                      src={p.image}
                      alt={p.name}
                      fallbackSeed={p.slug}
                      className="size-10 shrink-0 rounded-md border"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {p.name}
                    </span>
                    <span
                      className={
                        p.stock === 0
                          ? "text-sm font-semibold text-destructive"
                          : "text-sm font-semibold text-warm"
                      }
                    >
                      {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
