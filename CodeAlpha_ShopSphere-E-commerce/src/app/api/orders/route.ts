import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, getSessionUser } from "@/lib/auth-helpers";
import { mapOrder } from "@/lib/mappers";
import {
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
} from "@/lib/constants";

const shippingSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(4).max(40),
  address: z.string().min(5).max(300),
  city: z.string().min(2).max(120),
  state: z.string().min(2).max(120),
  zip: z.string().min(2).max(20),
  country: z.string().min(2).max(120),
});

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(999),
});

const createSchema = z.object({
  items: z.array(itemSchema).min(1, "Cart is empty"),
  shipping: shippingSchema,
  paymentMethod: z.string().min(2).max(40).default("cod"),
});

// GET /api/orders — current user's orders (admin can pass ?all=true)
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "true";

  const where = all && user.role === "admin" ? {} : { userId: user.id };
  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  return NextResponse.json({ data: orders.map(mapOrder) });
}

// POST /api/orders — create an order from cart items
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { items, shipping, paymentMethod } = parsed.data;

  // Fetch products + validate stock atomically (read-only check; the
  // transaction below is the source of truth for stock decrement).
  const productIds = items.map((i) => i.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
  });
  if (products.length !== productIds.length) {
    return NextResponse.json(
      { error: "One or more products no longer exist" },
      { status: 404 },
    );
  }
  for (const it of items) {
    const p = products.find((p) => p.id === it.productId)!;
    if (p.stock < it.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock for "${p.name}" (available: ${p.stock})` },
        { status: 409 },
      );
    }
  }

  const itemsTotal = items.reduce((sum, it) => {
    const p = products.find((p) => p.id === it.productId)!;
    return sum + p.price * it.quantity;
  }, 0);
  const shippingTotal =
    itemsTotal >= FREE_SHIPPING_THRESHOLD || itemsTotal === 0 ? 0 : SHIPPING_FLAT;
  const taxTotal = Math.round(itemsTotal * TAX_RATE * 100) / 100;
  const total = Math.round((itemsTotal + shippingTotal + taxTotal) * 100) / 100;

  try {
    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: user.id,
          itemsTotal,
          shippingTotal,
          taxTotal,
          total,
          status: "pending",
          paymentMethod,
          shippingName: shipping.name,
          shippingEmail: shipping.email.toLowerCase(),
          shippingPhone: shipping.phone,
          shippingAddress: shipping.address,
          shippingCity: shipping.city,
          shippingState: shipping.state,
          shippingZip: shipping.zip,
          shippingCountry: shipping.country,
          items: {
            create: items.map((it) => {
              const p = products.find((p) => p.id === it.productId)!;
              return {
                productId: p.id,
                name: p.name,
                price: p.price,
                quantity: it.quantity,
                image: p.image,
              };
            }),
          },
        },
        include: { items: true },
      });

      // Decrement stock for each product (guard against going negative).
      for (const it of items) {
        await tx.product.updateMany({
          where: { id: it.productId, stock: { gte: it.quantity } },
          data: { stock: { decrement: it.quantity } },
        });
      }
      return created;
    });

    return NextResponse.json(mapOrder(order), { status: 201 });
  } catch (e) {
    console.error("Order creation failed:", e);
    return NextResponse.json(
      { error: "Could not place order. Please try again." },
      { status: 500 },
    );
  }
}
