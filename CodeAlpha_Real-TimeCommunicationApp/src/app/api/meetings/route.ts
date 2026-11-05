import { db } from '@/lib/db'
import { fail, internalError, ok, readJson, zodMessage } from '@/lib/api'
import { createMeetingSchema } from '@/lib/validators'
import { getAuthUser } from '@/lib/auth'
import { generateRoomId } from '@/lib/roomId'

export const runtime = 'nodejs'

/**
 * POST /api/meetings — create a room and register the creator as its first
 * participant (join audit row). Room ids are 10 chars from a 32-symbol
 * alphabet → ~1e15 space; we still retry on the astronomically rare collision.
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthUser()
    if (!user) return fail(401, 'Not authenticated')

    const body = await readJson(req)
    if (body === null) return fail(400, 'Invalid JSON body')

    const parsed = createMeetingSchema.safeParse(body)
    if (!parsed.success) return fail(400, zodMessage(parsed.error))

    let meeting
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        meeting = await db.meeting.create({
          data: {
            roomId: generateRoomId(),
            title: parsed.data.title,
            createdById: user.id,
            participants: {
              // Creator joins their own meeting immediately (audit trail).
              create: { userId: user.id },
            },
          },
          include: { createdBy: { select: { id: true, name: true } } },
        })
        break
      } catch (err) {
        const isUniqueViolation =
          typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002'
        if (!isUniqueViolation || attempt === 4) throw err
        // P2002 on roomId → regenerate and try again.
      }
    }
    if (!meeting) return fail(500, 'Could not allocate a room id')

    return ok({
      meeting: {
        id: meeting.id,
        roomId: meeting.roomId,
        title: meeting.title,
        createdAt: meeting.createdAt,
        createdBy: meeting.createdBy,
      },
    })
  } catch (err) {
    return internalError('meetings/create', err)
  }
}

/**
 * GET /api/meetings — meeting history for the current user, newest first.
 * Reads the participant audit trail (take 40), dedupes by meeting keeping the
 * most recent join as `lastJoinedAt`, caps at 20 entries.
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return fail(401, 'Not authenticated')

    const participations = await db.meetingParticipant.findMany({
      where: { userId: user.id },
      orderBy: { joinedAt: 'desc' },
      take: 40,
      include: {
        meeting: {
          include: { createdBy: { select: { id: true, name: true } } },
        },
      },
    })

    // Dedupe by meetingId — rows are already newest-first, so the first
    // occurrence is the most recent join.
    type MeetingHistoryEntry = {
      roomId: string
      title: string
      createdAt: Date
      createdByName: string
      role: 'host' | 'participant'
      lastJoinedAt: Date
    }
    const seen = new Set<string>()
    const meetings: MeetingHistoryEntry[] = []
    for (const p of participations) {
      if (seen.has(p.meetingId)) continue
      seen.add(p.meetingId)
      meetings.push({
        roomId: p.meeting.roomId,
        title: p.meeting.title,
        createdAt: p.meeting.createdAt,
        createdByName: p.meeting.createdBy.name,
        role: p.meeting.createdById === user.id ? ('host' as const) : ('participant' as const),
        lastJoinedAt: p.joinedAt,
      })
      if (meetings.length >= 20) break
    }

    return ok({ meetings })
  } catch (err) {
    return internalError('meetings/history', err)
  }
}
