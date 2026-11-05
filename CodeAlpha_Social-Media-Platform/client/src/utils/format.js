/** Formats helpers shared across the UI. */

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

/** "/uploads/x.jpg" -> absolute; external URLs -> unchanged. */
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('/uploads/')) return `${API_ORIGIN}${path}`;
  return path;
};

export const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatJoined = (date) =>
  new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const getInitials = (name = '') => {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');
  return (letters || '?').toUpperCase();
};

/** Deterministic hue from any string (used for initials-avatar colors). */
export const hueFromString = (seed = '') => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
};

export const truncate = (str = '', max = 90) =>
  str.length > max ? `${str.slice(0, max).trimEnd()}...` : str;

export const formatCount = (n = 0) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k` : String(n));
