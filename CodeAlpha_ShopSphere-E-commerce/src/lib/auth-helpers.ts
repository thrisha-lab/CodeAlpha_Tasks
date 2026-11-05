import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Returns the authenticated user from the session (with role).
export async function getSessionUser(): Promise<ServerUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

// Returns the authenticated user OR a 401 response.
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, response: null };
}

// Returns an admin user OR a 401/403 response.
export async function requireAdmin() {
  const { user, response } = await requireUser();
  if (response) return { user: null, response };
  if (user!.role !== "admin") {
    return {
      user: null,
      response: NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 }),
    };
  }
  return { user, response: null };
}

// Quick DB lookup for current user (used by profile endpoints).
export async function getCurrentUserRecord() {
  const user = await getSessionUser();
  if (!user) return null;
  return db.user.findUnique({ where: { id: user.id } });
}
