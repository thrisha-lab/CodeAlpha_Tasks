"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api, HttpError } from "@/lib/api";
import { toast } from "sonner";
import type {
  ProductDTO,
  ProductListResponse,
  ProductsQuery,
  CategoryDTO,
  OrderDTO,
  ShippingInfo,
} from "@/types";
import { useCartStore } from "@/store/cart-store";

const PRODUCTS_KEY = "products";
const CATEGORIES_KEY = "categories";

export function buildProductsKey(q: ProductsQuery) {
  return [PRODUCTS_KEY, q] as const;
}

export function useProducts(query: ProductsQuery) {
  return useQuery<ProductListResponse>({
    queryKey: buildProductsKey(query),
    queryFn: () => api.get<ProductListResponse>("/api/products" + toQS(query)),
  });
}

function toQS(q: ProductsQuery): string {
  const sp = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function useProduct(idOrSlug: string | undefined) {
  return useQuery<ProductDTO>({
    queryKey: ["product", idOrSlug],
    queryFn: () => api.get<ProductDTO>(`/api/products/${idOrSlug}`),
    enabled: !!idOrSlug,
  });
}

export function useFeaturedProducts() {
  return useQuery<{ data: ProductDTO[] }>({
    queryKey: ["products", "featured"],
    queryFn: () => api.get<{ data: ProductDTO[] }>("/api/products/featured"),
  });
}

export function useNewProducts() {
  return useQuery<{ data: ProductDTO[] }>({
    queryKey: ["products", "new"],
    queryFn: () => api.get<{ data: ProductDTO[] }>("/api/products/new"),
  });
}

export function useCategories() {
  return useQuery<{ data: CategoryDTO[] }>({
    queryKey: [CATEGORIES_KEY],
    queryFn: () => api.get<{ data: CategoryDTO[] }>("/api/categories"),
    staleTime: 5 * 60_000,
  });
}

export function useRelatedProducts(product: ProductDTO | undefined, limit = 4) {
  return useQuery<{ data: ProductDTO[] }>({
    queryKey: ["products", "related", product?.categoryId],
    queryFn: () =>
      api.get<{ data: ProductDTO[] }>(
        `/api/products?category=${encodeURIComponent(
          product!.category.slug,
        )}&pageSize=12`,
      ),
    enabled: !!product,
    select: (res) => ({
      data: res.data.filter((p) => p.id !== product!.id).slice(0, limit),
    }),
  });
}

// ── Admin product mutations ────────────────────────────────
export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      api.post<ProductDTO>("/api/products", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
      qc.invalidateQueries({ queryKey: ["products", "featured"] });
      qc.invalidateQueries({ queryKey: ["products", "new"] });
      toast.success("Product created");
    },
    onError: (e) => toast.error((e as HttpError).message || "Could not create product"),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      api.put<ProductDTO>(`/api/products/${id}`, input),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
      qc.invalidateQueries({ queryKey: ["product", p.id] });
      qc.invalidateQueries({ queryKey: ["products", "featured"] });
      qc.invalidateQueries({ queryKey: ["products", "new"] });
      toast.success("Product updated");
    },
    onError: (e) => toast.error((e as HttpError).message || "Could not update product"),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: boolean }>(`/api/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
      qc.invalidateQueries({ queryKey: ["products", "featured"] });
      qc.invalidateQueries({ queryKey: ["products", "new"] });
      toast.success("Product deleted");
    },
    onError: (e) => toast.error((e as HttpError).message || "Could not delete product"),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; image?: string }) =>
      api.post<CategoryDTO>("/api/categories", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
      toast.success("Category created");
    },
    onError: (e) => toast.error((e as HttpError).message || "Could not create category"),
  });
}

// ── Orders ─────────────────────────────────────────────────
export function useOrders() {
  return useQuery<{ data: OrderDTO[] }>({
    queryKey: ["orders"],
    queryFn: () => api.get<{ data: OrderDTO[] }>("/api/orders"),
  });
}

export function useOrder(id: string | undefined) {
  return useQuery<OrderDTO>({
    queryKey: ["order", id],
    queryFn: () => api.get<OrderDTO>(`/api/orders/${id}`),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  const clearCart = useCartStore((s) => s.clear);
  return useMutation({
    mutationFn: (input: {
      items: { productId: string; quantity: number }[];
      shipping: ShippingInfo;
      paymentMethod?: string;
    }) => api.post<OrderDTO>("/api/orders", input),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      clearCart();
      toast.success("Order placed successfully!");
      return order;
    },
    onError: (e) =>
      toast.error((e as HttpError).message || "Could not place order"),
  });
}
