import { db } from '@/lib/db'
import { fail, internalError, ok, readJson, zodMessage } from '@/lib/api'
import { profileSchema } from '@/lib/validators'
import { getAuthUser } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * PUT /api/profile — partial update of `{ name?, bio? }`.
 * Only fields present in the body are changed; bio can be cleared with "".
 */
export async function PUT(req: Request) {
  try {
    const user = await getAuthUser()
    if (!user) return fail(401, 'Not authenticated')

    const body = await readJson(req)
    if (body === null) return fail(400, 'Invalid JSON body')

    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) return fail(400, zodMessage(parsed.error))

    const data: { name?: string; bio?: string } = {}
    if (parsed.data.name !== undefined) data.name = parsed.data.name
    if (parsed.data.bio !== undefined) data.bio = parsed.data.bio

    if (Object.keys(data).length === 0) {
      return fail(400, 'Nothing to update: provide "name" and/or "bio"')
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: { id: true, name: true, username: true, email: true, bio: true, createdAt: true },
    })

    return ok({ user: updated })
  } catch (err) {
    return internalError('profile', err)
  }
}
