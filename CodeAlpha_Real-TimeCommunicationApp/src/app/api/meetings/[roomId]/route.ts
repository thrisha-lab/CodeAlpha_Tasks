import { db } from '@/lib/db'
import { fail, internalError, ok } from '@/lib/api'
import { getAuthUser } from '@/lib/auth'
import { stripRoomIdDashes } from '@/lib/roomId'

export const runtime = 'nodejs'

/**
 * GET /api/meetings/[roomId] — meeting info + join audit.
 * `params` is a Promise in Next.js 15+/16 → must be awaited.
 * Also upserts a MeetingParticipant row for the current user when they do not
 * have an active (leftAt == null) participation — REST-side join bookkeeping
 * that complements the socket server's in-memory presence.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const user = await getAuthUser()
    if (!user) return fail(401, 'Not authenticated')

    const { roomId: rawRoomId } = await params
    const roomId = stripRoomIdDashes(rawRoomId)

    const meeting = await db.meeting.findUnique({
      where: { roomId },
      include: { createdBy: { select: { name: true } } },
    })
    if (!meeting) return fail(404, 'Meeting not found')

    // Join audit: only insert when there is no ACTIVE row for this user.
    const activeParticipation = await db.meetingParticipant.findFirst({
      where: { meetingId: meeting.id, userId: user.id, leftAt: null },
    })
    if (!activeParticipation) {
      await db.meetingParticipant.create({
        data: { meetingId: meeting.id, userId: user.id },
      })
    }

    // Count AFTER the audit insert so the current user is included.
    const participantCount = await db.meetingParticipant.count({
      where: { meetingId: meeting.id, leftAt: null },
    })

    return ok({
      meeting: {
        roomId: meeting.roomId,
        title: meeting.title,
        createdAt: meeting.createdAt,
        createdBy: meeting.createdBy,
        participantCount,
      },
    })
  } catch (err) {
    return internalError('meetings/[roomId]', err)
  }
}
