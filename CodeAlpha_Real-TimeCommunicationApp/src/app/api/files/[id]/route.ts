import { readFile } from 'fs/promises'
import { db } from '@/lib/db'
import { fail, internalError } from '@/lib/api'
import { getAuthUser } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * Content-Disposition per RFC 6266/5987: plain-ASCII fallback in `filename`
 * plus UTF-8 percent-encoded `filename*` so Unicode names survive the header.
 * Quotes/percent/specials in the fallback are neutralized to avoid header injection.
 */
function contentDisposition(filename: string): string {
  const fallback =
    filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_') || 'download'
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  )
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

/** GET /api/files/[id] — authenticated download stream of a shared file. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser()
    if (!user) return fail(401, 'Not authenticated')

    const { id } = await params
    const sharedFile = await db.sharedFile.findUnique({ where: { id } })
    if (!sharedFile) return fail(404, 'File not found')

    // storedPath is server-generated (uploads/<cuid><ext>), never user input.
    let bytes: Buffer
    try {
      bytes = await readFile(sharedFile.storedPath)
    } catch {
      // DB row exists but the binary is gone (manual deletion / lost volume).
      return fail(404, 'File not found')
    }

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        // Serve the stored MIME type (from the allowlist at upload time),
        // and force attachment so browsers never render/execute in-app.
        'Content-Type': sharedFile.mimeType || 'application/octet-stream',
        'Content-Length': String(bytes.length),
        'Content-Disposition': contentDisposition(sharedFile.filename),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    return internalError('files/[id]', err)
  }
}
