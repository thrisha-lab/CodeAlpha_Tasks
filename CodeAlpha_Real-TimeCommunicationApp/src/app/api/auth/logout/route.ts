import { ok } from '@/lib/api'
import { clearAuthCookie } from '@/lib/auth'

export const runtime = 'nodejs'

/** POST /api/auth/logout — expire the auth cookie; idempotent, no auth required. */
export async function POST() {
  try {
    await clearAuthCookie()
    return ok({})
  } catch (err) {
    // Logging out must never fail the user experience — but log for diagnosis.
    console.error('[api:auth/logout]', err)
    return ok({})
  }
}
