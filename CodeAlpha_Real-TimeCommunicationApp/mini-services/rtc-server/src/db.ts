// Read-only access to the app's SQLite database (Prisma-managed schema).
// Table `Meeting`, columns `roomId` + `title` — see docs/CONTRACTS.md.
import { Database } from 'bun:sqlite'

const DB_PATH = '/home/z/my-project/db/custom.db'

export interface MeetingRow {
  id: string
  title: string
}

let db: Database | null = null
try {
  db = new Database(DB_PATH, { readonly: true })
  console.log(`[rtc-server] SQLite opened read-only at ${DB_PATH}`)
} catch (err) {
  // Missing/unreadable DB file must not crash the service — joins will fail
  // gracefully with ROOM_NOT_FOUND until the file is available again.
  console.error(`[rtc-server] WARN: could not open ${DB_PATH} read-only:`, err)
  db = null
}

const lookup = db ? db.query('SELECT id, title FROM Meeting WHERE roomId = ?') : null

export function roomExists(roomId: string): MeetingRow | null {
  if (!lookup) return null
  try {
    const row = lookup.get(roomId) as MeetingRow | null
    return row ?? null
  } catch (err) {
    console.error('[rtc-server] roomExists query failed:', err)
    return null
  }
}
