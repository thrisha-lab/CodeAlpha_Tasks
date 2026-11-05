import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { mapProduct } from "@/lib/mappers";
import { slugify } from "@/lib/format";

interface Params {
  params: Promise<{ id: string }>;
}

// Lookup by id OR slug (robust for both internal nav + shareable links).
async function findProduct(key: string) {
  return db.product.findFirst({
    where: { OR: [{ id: key }, { slug: key }] },
    include: { category: true },
  });
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const product = await findProduct(id);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  return NextResponse.json(mapProduct(product));
}

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().min(10).max(4000).optional(),
  price: z.number().min(0).optional(),
  image: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
  categorySlug: z.string().min(1).optional(),
  stock: z.number().int().min(0).optional(),
  rating: z.number().min(0).max(5).optional(),
  numReviews: z.number().int().min(0).optional(),
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  brand: z.string().optional(),
});

export async function PUT(req: Request, { params }: Params) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const existing = await findProduct(id);
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const d = parsed.data;

  const data: Record<string, unknown> = {};
  if (d.name !== undefined) {
    data.name = d.name;
    const newSlug = slugify(d.name);
    const conflict = await db.product.findFirst({
      where: { slug: newSlug, NOT: { id: existing.id } },
    });
    data.slug = conflict ? `${newSlug}-${Date.now().toString(36)}` : newSlug;
  }
  if (d.description !== undefined) data.description = d.description;
  if (d.price !== undefined) data.price = d.price;
  if (d.image !== undefined) data.image = d.image;
  if (d.images !== undefined) data.images = d.images.join("|");
  if (d.stock !== undefined) data.stock = d.stock;
  if (d.rating !== undefined) data.rating = d.rating;
  if (d.numReviews !== undefined) data.numReviews = d.numReviews;
  if (d.featured !== undefined) data.featured = d.featured;
  if (d.isNew !== undefined) data.isNew = d.isNew;
  if (d.brand !== undefined) data.brand = d.brand;
  if (d.categorySlug !== undefined) {
    const category = await db.category.findUnique({
      where: { slug: d.categorySlug },
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    data.categoryId = category.id;
  }

  const product = await db.product.update({
    where: { id: existing.id },
    data,
    include: { category: true },
  });
  return NextResponse.json(mapProduct(product));
}

export async function DELETE(_req: Request, { params }: Params) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const existing = await findProduct(id);
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  await db.product.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
