import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapProduct } from "@/lib/mappers";

export async function GET() {
  const products = await db.product.findMany({
    where: { isNew: true },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { category: true },
  });
  return NextResponse.json({ data: products.map(mapProduct) });
}
