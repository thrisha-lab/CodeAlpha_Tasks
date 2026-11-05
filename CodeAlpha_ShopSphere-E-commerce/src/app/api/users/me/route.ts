import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";

// GET /api/users/me — current user's full profile (no password)
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const record = await db.user.findUnique({
    where: { id: user!.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      createdAt: true,
    },
  });
  if (!record) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({
    ...record,
    createdAt: record.createdAt.toISOString(),
  });
}

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().max(40).optional().or(z.literal("")),
});

// PUT /api/users/me — update profile fields
export async function PUT(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

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
  const record = await db.user.update({
    where: { id: user!.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      createdAt: true,
    },
  });
  return NextResponse.json({
    ...record,
    createdAt: record.createdAt.toISOString(),
  });
}
