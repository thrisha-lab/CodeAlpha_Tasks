// Shared domain types used across the app (frontend + API responses).

export type Role = "customer" | "admin";

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
  createdAt: string;
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
}

export interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image: string;
  images: string[];
  category: CategoryDTO;
  categoryId: string;
  rating: number;
  numReviews: number;
  stock: number;
  featured: boolean;
  isNew: boolean;
  brand: string;
  createdAt: string;
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface ShippingInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface OrderDTO {
  id: string;
  userId: string;
  items: OrderItemDTO[];
  itemsTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  status: OrderStatus;
  shipping: ShippingInfo;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface ProductListResponse {
  data: ProductDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductsQuery {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "rating" | "featured";
  page?: number;
  pageSize?: number;
  featured?: boolean;
  isNew?: boolean;
}
