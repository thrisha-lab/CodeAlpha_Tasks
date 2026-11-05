// Formatting helpers

/** `ABC23DEFGH` → `ABC-23D-EFG` (display only) */
export function formatRoomId(roomId: string): string {
  const clean = roomId.replace(/-/g, '')
  if (clean.length !== 10) return roomId
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function formatTime(iso: string | number | Date): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(iso: string | number | Date): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

const AVATAR_COLORS = [
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-teal-600',
  'bg-violet-600',
  'bg-orange-600',
  'bg-cyan-700',
  'bg-lime-700',
]

/** Deterministic avatar background for a name. */
export function avatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function describeMediaError(kind: MediaErrorKindLike): { title: string; hint: string } {
  switch (kind) {
    case 'camera-denied':
      return {
        title: 'Camera access denied',
        hint: 'Allow camera access in your browser site settings, then try again — or join without video.',
      }
    case 'mic-denied':
      return {
        title: 'Microphone access denied',
        hint: 'Allow microphone access in your browser site settings, then try again — or join without audio.',
      }
    case 'not-found':
      return {
        title: 'No camera or microphone found',
        hint: 'Connect a camera/microphone and try again, or join without media.',
      }
    case 'in-use':
      return {
        title: 'Camera/microphone is already in use',
        hint: 'Close other apps using your camera (e.g. another call) and try again.',
      }
    case 'screen-denied':
      return {
        title: 'Screen sharing was cancelled or denied',
        hint: 'Select a screen/window in the browser dialog to start sharing.',
      }
    default:
      return {
        title: 'Media error',
        hint: 'Something went wrong accessing your devices. You can still join without media.',
      }
  }
}

type MediaErrorKindLike = import('./types').MediaErrorKind
