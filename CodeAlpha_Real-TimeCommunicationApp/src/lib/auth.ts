import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

/** Cookie name shared by all auth'd REST routes. */
export const AUTH_COOKIE = 'rtc_token'

/** 7 days in seconds — must match JWT_EXPIRES_IN default so cookie & token expire together. */
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60

/** Public user shape — NEVER include the password hash in any response. */
export type AuthUser = {
  id: string
  name: string
  username: string
  email: string
  bio: string | null
  createdAt: Date
}

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  bio: true,
  createdAt: true,
} satisfies Record<string, boolean>

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return secret
}

/**
 * Sign an HS256 JWT with payload `{ sub, name, username }`.
 * The same secret (JWT_SECRET) is shared with the socket.io mini-service,
 * so one token authenticates both REST and realtime.
 */
export function signToken(user: Pick<AuthUser, 'id' | 'name' | 'username'>): string {
  return jwt.sign(
    { sub: user.id, name: user.name, username: user.username },
    getJwtSecret(),
    {
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
    },
  )
}

/**
 * Persist the JWT in an httpOnly cookie:
 * - httpOnly: not readable from JS → mitigates XSS token theft
 * - sameSite 'lax': mitigates CSRF while allowing normal top-level navigation
 * - secure: only over HTTPS in production
 * Note: `cookies()` is async in Next.js 15+/16.
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}

/** Expire the auth cookie (maxAge 0) on logout. */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

/**
 * Read the auth cookie, verify the JWT, and load the (password-free) user from DB.
 * Returns null for: missing cookie, bad/expired token, or deleted user —
 * callers respond with 401.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE)?.value
  if (!token) return null

  let payload: jwt.JwtPayload
  try {
    const verified = jwt.verify(token, getJwtSecret())
    if (typeof verified === 'string') return null
    payload = verified
  } catch {
    return null
  }

  if (typeof payload.sub !== 'string') return null

  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: USER_SELECT,
  })
  return user
}
