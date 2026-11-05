import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

// GET /api/admin/users — list all users (admin only). Passwords excluded.
export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });
  return NextResponse.json({
    data: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      orderCount: u._count.orders,
      _count: undefined,
    })),
  });
}
