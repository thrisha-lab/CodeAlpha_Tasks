import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { mapOrder } from "@/lib/mappers";

// GET /api/admin/orders — all orders with basic user info (admin only)
export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json({
    data: orders.map((o) => ({
      ...mapOrder(o),
      user: o.user,
    })),
  });
}
