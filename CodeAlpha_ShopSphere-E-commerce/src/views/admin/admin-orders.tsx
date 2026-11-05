"use client";

import { useMemo, useState } from "react";
import { Search, X, Loader2, ShoppingBag } from "lucide-react";
import { useAdminOrders, useUpdateOrderStatus } from "@/hooks/use-admin";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
} from "@/lib/constants";
import type { OrderStatus } from "@/types";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function AdminOrders() {
  const { data, isLoading } = useAdminOrders();
  const updateStatus = useUpdateOrderStatus();

  const [search, setSearch] = useState("");

  const orders = data?.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      return (
        o.id.toLowerCase().includes(q) ||
        (o.user?.name ?? "").toLowerCase().includes(q) ||
        (o.user?.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, search]);

  const pendingId = updateStatus.isPending
    ? updateStatus.variables?.id
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Orders
        </h2>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by id or customer…"
            className="pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto nice-scroll">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingBag className="size-5 text-muted-foreground" />
                      No orders yet.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">
                      {shortId(o.id)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{o.user?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {o.user?.email ?? ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(o.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {o.items?.length ?? 0}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(o.total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={o.status}
                          onValueChange={(v) =>
                            updateStatus.mutate({
                              id: o.id,
                              status: v as OrderStatus,
                            })
                          }
                          disabled={pendingId === o.id}
                        >
                          <SelectTrigger
                            size="sm"
                            className="w-[140px]"
                            aria-label={`Status for order ${o.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {ORDER_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {ORDER_STATUS_LABEL[s] ?? s}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {pendingId === o.id && (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
