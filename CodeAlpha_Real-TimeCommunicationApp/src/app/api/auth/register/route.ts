import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { fail, internalError, ok, readJson, zodMessage } from '@/lib/api'
import { registerSchema } from '@/lib/validators'
import { setAuthCookie, signToken } from '@/lib/auth'

export const runtime = 'nodejs'

/** POST /api/auth/register — create account, hash password (bcrypt, cost 10), set auth cookie. */
export async function POST(req: Request) {
  try {
    const body = await readJson(req)
    if (body === null) return fail(400, 'Invalid JSON body')

    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) return fail(400, zodMessage(parsed.error))
    const { name, username, email, password } = parsed.data

    // Check username and email separately so the client gets a precise message.
    const takenUsername = await db.user.findUnique({ where: { username } })
    if (takenUsername) return fail(409, 'Username is already taken')

    const takenEmail = await db.user.findUnique({ where: { email } })
    if (takenEmail) return fail(409, 'Email is already registered')

    // bcrypt with cost 10 ≈ 100ms — good balance for this project scale.
    const passwordHash = await bcrypt.hash(password, 10)

    let user
    try {
      user = await db.user.create({
        data: { name, username, email, password: passwordHash },
        select: { id: true, name: true, username: true, email: true, bio: true, createdAt: true },
      })
    } catch (err) {
      // Unique index is the real guard against register races → 409, never 500.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return fail(409, 'Username or email is already taken')
      }
      throw err
    }

    await setAuthCookie(signToken(user))
    return ok({ user })
  } catch (err) {
    // Real cause goes to server logs; client gets a safe generic message.
    return internalError('auth/register', err)
  }
}
