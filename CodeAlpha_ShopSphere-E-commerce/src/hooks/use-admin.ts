"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, HttpError } from "@/lib/api";
import { toast } from "sonner";
import type { OrderDTO, OrderStatus } from "@/types";

export interface AdminOrderDTO extends OrderDTO {
  user: { id: string; name: string; email: string };
}

export function useAdminOrders() {
  return useQuery<{ data: AdminOrderDTO[] }>({
    queryKey: ["admin", "orders"],
    queryFn: () => api.get<{ data: AdminOrderDTO[] }>("/api/admin/orders"),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.put<OrderDTO>(`/api/orders/${id}`, { status }),
    onSuccess: (o) => {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", o.id] });
      toast.success(`Order status updated to ${o.status}`);
    },
    onError: (e) => toast.error((e as HttpError).message || "Could not update order"),
  });
}

export interface AdminUserDTO {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  createdAt: string;
  orderCount: number;
}

export function useAdminUsers() {
  return useQuery<{ data: AdminUserDTO[] }>({
    queryKey: ["admin", "users"],
    queryFn: () => api.get<{ data: AdminUserDTO[] }>("/api/admin/users"),
  });
}
