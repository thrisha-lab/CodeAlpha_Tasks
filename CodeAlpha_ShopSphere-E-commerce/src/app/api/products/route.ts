import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { mapProduct } from "@/lib/mappers";
import { slugify } from "@/lib/format";
import type { Prisma } from "@prisma/client";

// GET /api/products — list + search + filter + sort + paginate
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const q = sp.get("q")?.trim() || undefined;
  const category = sp.get("category") || undefined; // slug
  const minPrice = sp.get("minPrice") ? Number(sp.get("minPrice")) : undefined;
  const maxPrice = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined;
  const sort = sp.get("sort") || "featured";
  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = Math.min(48, Math.max(1, Number(sp.get("pageSize") || 12)));
  const featured = sp.get("featured") === "true" ? true : undefined;
  const isNew = sp.get("isNew") === "true" ? true : undefined;

  const where: Prisma.ProductWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
      { brand: { contains: q } },
    ];
  }
  if (category && category !== "all") {
    where.category = { slug: category };
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }
  if (featured) where.featured = true;
  if (isNew) where.isNew = true;

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc"
      ? { price: "asc" }
      : sort === "price_desc"
        ? { price: "desc" }
        : sort === "rating"
          ? { rating: "desc" }
          : sort === "newest"
            ? { createdAt: "desc" }
            : { featured: "desc" };

  const [total, data] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy,
      include: { category: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data: data.map(mapProduct),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(10).max(4000),
  price: z.number().min(0),
  image: z.string().url(),
  images: z.array(z.string().url()).optional(),
  categorySlug: z.string().min(1),
  stock: z.number().int().min(0).default(0),
  rating: z.number().min(0).max(5).default(0),
  numReviews: z.number().int().min(0).default(0),
  featured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  brand: z.string().default("ShopSphere"),
});

// POST /api/products — admin only
export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

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
  const d = parsed.data;
  const category = await db.category.findUnique({
    where: { slug: d.categorySlug },
  });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const slug = slugify(d.name);
  const existing = await db.product.findUnique({ where: { slug } });
  const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

  const product = await db.product.create({
    data: {
      name: d.name,
      slug: finalSlug,
      description: d.description,
      price: d.price,
      image: d.image,
      images: (d.images ?? []).join("|"),
      categoryId: category.id,
      stock: d.stock,
      rating: d.rating,
      numReviews: d.numReviews,
      featured: d.featured,
      isNew: d.isNew,
      brand: d.brand,
    },
    include: { category: true },
  });

  return NextResponse.json(mapProduct(product), { status: 201 });
}
