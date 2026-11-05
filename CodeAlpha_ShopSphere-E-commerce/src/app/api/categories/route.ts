import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { mapCategory } from "@/lib/mappers";
import { slugify } from "@/lib/format";

export async function GET() {
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: categories.map(mapCategory) });
}

const createSchema = z.object({
  name: z.string().min(2).max(60),
  image: z.string().url().optional().or(z.literal("")),
});

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
  const { name, image } = parsed.data;
  const slug = slugify(name);
  const existing = await db.category.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }
  const cat = await db.category.create({
    data: { name, slug, image: image || null },
  });
  return NextResponse.json(mapCategory(cat), { status: 201 });
}
