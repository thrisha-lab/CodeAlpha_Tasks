import { z } from 'zod'

/**
 * All request-body validation lives here (zod v4).
 * Messages are user-facing — keep them short and actionable.
 */

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be 2–50 characters').max(50, 'Name must be 2–50 characters'),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be 3–20 characters')
    .max(20, 'Username must be 3–20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers and underscores'),
  email: z.string().trim().toLowerCase().pipe(z.email('Please provide a valid email address')),
  // ≥8 chars with at least one letter AND one digit (weak-password guard).
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
})

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Identifier must be 3–100 characters').max(100),
  password: z.string().min(1, 'Password is required').max(100),
})

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be 2–50 characters').max(50, 'Name must be 2–50 characters').optional(),
  bio: z.string().max(280, 'Bio must be at most 280 characters').optional(),
})

export const createMeetingSchema = z.object({
  title: z.string().trim().min(3, 'Title must be 3–80 characters').max(80, 'Title must be 3–80 characters'),
})

export const uploadSchema = z.object({
  roomId: z.string().trim().min(1, 'roomId is required'),
})

/**
 * MIME allowlist for uploads — anything not listed is rejected with 415.
 * Blocks executables/scripts (.exe, .sh, .bat, .html can execute/flash download).
 */
export const MIME_ALLOWLIST = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4',
  'audio/mpeg',
  'audio/wav',
])

/** Max upload size in bytes, from UPLOAD_MAX_MB (default 15 MB → 413 when exceeded). */
export function maxUploadBytes(): number {
  const mb = parseInt(process.env.UPLOAD_MAX_MB || '15', 10)
  return (Number.isFinite(mb) && mb > 0 ? mb : 15) * 1024 * 1024
}
