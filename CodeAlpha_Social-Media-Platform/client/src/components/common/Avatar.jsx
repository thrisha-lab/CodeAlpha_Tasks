import { useState, useEffect } from 'react';
import { getImageUrl, getInitials, hueFromString } from '../../utils/format';

/**
 * Avatar with graceful fallback: renders the image when available,
 * otherwise colored initials derived from the username. If the image
 * fails to load (broken URL / offline), initials are shown instead.
 */
export default function Avatar({ user, size = 'md', ring = false, alt = '' }) {
  const src = getImageUrl(user?.avatar);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const hue = hueFromString(user?.username || user?.name || 'user');
  const cls = `avatar avatar-${size}${ring ? ' avatar-ring' : ''}`;

  if (src && !failed) {
    return (
      <img
        className={cls}
        src={src}
        alt={alt || `${user?.name || 'user'}'s avatar`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`avatar-fallback ${size}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue}, 72%, 58%), hsl(${(hue + 40) % 360}, 68%, 46%))` }}
      aria-label={alt || `${user?.name || 'user'}'s avatar`}
      role="img"
    >
      {getInitials(user?.name)}
    </div>
  );
}
