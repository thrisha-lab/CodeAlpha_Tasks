import { randomBytes } from 'crypto'

/**
 * Room IDs are 10 characters drawn from an unambiguous alphabet
 * (no 0/O or 1/I) so they can be read aloud / handwritten safely.
 * 256 % 32 === 0, so `byte % 32` introduces no modulo bias.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const ROOM_ID_LENGTH = 10

/** Generate a secure 10-char room id, e.g. "K7QM2XRP9B" (stored WITHOUT dashes). */
export function generateRoomId(): string {
  const bytes = randomBytes(ROOM_ID_LENGTH)
  let id = ''
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return id
}

/** Users may type "K7Q-M2X-RP9B" — always normalize before DB lookups. */
export function stripRoomIdDashes(id: string): string {
  return id.replace(/-/g, '')
}

/** UI presentation format: "K7QM2XRP9B" → "K7Q-M2X-RP9B" (XXX-XXX-XXXX). */
export function formatRoomId(id: string): string {
  const clean = stripRoomIdDashes(id)
  return [clean.slice(0, 3), clean.slice(3, 6), clean.slice(6, 10)]
    .filter(Boolean)
    .join('-')
}
