import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'

/** Success envelope: `{ ok: true, data }` — the single response shape per CONTRACTS.md. */
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status })
}

/** Error envelope: `{ ok: false, error }` with the proper HTTP status. */
export function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

/**
 * Convert a ZodError into one short, human-readable message.
 * Picks the first issue so the client sees the most relevant problem first.
 */
export function zodMessage(err: ZodError): string {
  const first = err.issues[0]
  if (!first) return 'Invalid input'
  const path = first.path.map(String).join('.')
  return path ? `Invalid ${path}: ${first.message}` : first.message
}

/** Parse a JSON request body, returning null when the payload is not valid JSON. */
export async function readJson(req: Request): Promise<unknown | null> {
  try {
    return await req.json()
  } catch {
    return null
  }
}

/**
 * Central last-resort error handler for route handlers.
 *
 * - ALWAYS logs the real error (with a scope tag) to the server console so the
 *   terminal/dev.log shows the actual root cause — never swallow errors silently.
 * - NEVER sends internals to the client: no stack traces, no secrets, no query text.
 * - Distinguishes server-configuration errors (missing env vars) so operators
 *   immediately see WHAT is misconfigured instead of a generic 500.
 */
export function internalError(scope: string, err: unknown): NextResponse {
  // Server-side log: the one place where full detail is appropriate.
  console.error(`[api:${scope}]`, err)

  // Missing/invalid environment configuration → actionable 503 that names the
  // variable (its NAME is not a secret; the VALUE is never echoed).
  if (err instanceof Error && /JWT_SECRET|JWT_EXPIRES_IN|DATABASE_URL/.test(err.message)) {
    return fail(503, `Server configuration error: ${err.message}. Check .env (see .env.example).`)
  }

  // Genuine unexpected error → generic, safe message.
  return fail(500, 'Internal server error')
}
