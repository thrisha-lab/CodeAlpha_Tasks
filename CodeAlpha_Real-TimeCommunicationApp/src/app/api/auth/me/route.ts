import { fail, internalError, ok } from '@/lib/api'
import { getAuthUser } from '@/lib/auth'

export const runtime = 'nodejs'

/** GET /api/auth/me — current session user (password-free) or 401. */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return fail(401, 'Not authenticated')
    return ok({ user })
  } catch (err) {
    return internalError('auth/me', err)
  }
}
