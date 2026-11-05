import { fail, internalError, ok } from '@/lib/api'
import { getAuthUser, signToken } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * GET /api/auth/token — return a fresh JWT for socket.io handshake auth
 * (`io(..., { auth: { token } })`). REST keeps using the httpOnly cookie;
 * the socket mini-service cannot read cookies through the gateway, so the
 * client passes this token explicitly.
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return fail(401, 'Not authenticated')
    return ok({ token: signToken(user) })
  } catch (err) {
    return internalError('auth/token', err)
  }
}
