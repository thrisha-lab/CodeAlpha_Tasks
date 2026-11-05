// Convert Prisma rows into DTOs safe to send to the client.
import type { Product, Category, Order, OrderItem } from "@prisma/client";
import type {
  ProductDTO,
  CategoryDTO,
  OrderDTO,
  OrderItemDTO,
  OrderStatus,
} from "@/types";

export function mapCategory(c: Category): CategoryDTO {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image ?? null,
  };
}

export function mapProduct(
  p: Product & { category: Category },
): ProductDTO {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    image: p.image,
    images: p.images ? p.images.split("|").filter(Boolean) : [],
    category: mapCategory(p.category),
    categoryId: p.categoryId,
    rating: p.rating,
    numReviews: p.numReviews,
    stock: p.stock,
    featured: p.featured,
    isNew: p.isNew,
    brand: p.brand,
    createdAt: p.createdAt.toISOString(),
  };
}

export function mapOrderItem(oi: OrderItem): OrderItemDTO {
  return {
    id: oi.id,
    productId: oi.productId,
    name: oi.name,
    price: oi.price,
    quantity: oi.quantity,
    image: oi.image,
  };
}

export function mapOrder(o: Order & { items: OrderItem[] }): OrderDTO {
  return {
    id: o.id,
    userId: o.userId,
    items: o.items.map(mapOrderItem),
    itemsTotal: o.itemsTotal,
    shippingTotal: o.shippingTotal,
    taxTotal: o.taxTotal,
    total: o.total,
    status: o.status as OrderStatus,
    shipping: {
      name: o.shippingName,
      email: o.shippingEmail,
      phone: o.shippingPhone,
      address: o.shippingAddress,
      city: o.shippingCity,
      state: o.shippingState,
      zip: o.shippingZip,
      country: o.shippingCountry,
    },
    paymentMethod: o.paymentMethod,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}
