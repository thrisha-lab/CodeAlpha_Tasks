import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { fail, internalError, ok, readJson, zodMessage } from '@/lib/api'
import { loginSchema } from '@/lib/validators'
import { setAuthCookie, signToken } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * POST /api/auth/login — authenticate by username OR email (`identifier`).
 * Always answer 401 with the same generic message on failure so we never
 * reveal whether an account exists (no user enumeration).
 */
export async function POST(req: Request) {
  try {
    const body = await readJson(req)
    if (body === null) return fail(400, 'Invalid JSON body')

    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return fail(400, zodMessage(parsed.error))
    const { identifier, password } = parsed.data

    const user = await db.user.findFirst({
      // Emails are stored lowercased (normalized at register).
      where: { OR: [{ username: identifier }, { email: identifier.toLowerCase() }] },
    })

    if (!user) return fail(401, 'Invalid credentials')

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return fail(401, 'Invalid credentials')

    // Constant-time-ish compare already happened; safe to issue session now.
    await setAuthCookie(
      signToken({ id: user.id, name: user.name, username: user.username }),
    )

    return ok({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    return internalError('auth/login', err)
  }
}
