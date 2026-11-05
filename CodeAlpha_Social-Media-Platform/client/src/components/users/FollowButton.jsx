import { useState } from 'react';
import { followService } from '../../services/followService';
import { getErrorMessage } from '../../services/api';
import Spinner from '../common/Spinner';
import { UserCheckIcon, UserPlusIcon } from '../icons';

/**
 * Follow / Following toggle. Hidden for the user's own profile.
 * `onChange(delta, following)` lets parents sync counts.
 */
export default function FollowButton({ target, size = '', onChange }) {
  const [following, setFollowing] = useState(!!target.isFollowing);
  const [busy, setBusy] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [error, setError] = useState('');

  if (target.isSelf) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const next = !following;
      const res = next
        ? await followService.follow(target._id)
        : await followService.unfollow(target._id);
      setFollowing(res.following);
      onChange?.(res.following ? 1 : -1, res.following, res.followersCount);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const label = following ? (hovering ? 'Unfollow' : 'Following') : 'Follow';

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <button
        className={`btn ${following ? 'btn-outline' : 'btn-primary'} ${size}`}
        onClick={toggle}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        disabled={busy}
        aria-pressed={following}
        aria-label={`${following ? 'Unfollow' : 'Follow'} @${target.username}`}
        title={error || undefined}
        style={following && hovering ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : undefined}
      >
        {busy ? (
          <Spinner size="sm" light={!following} />
        ) : following ? (
          <UserCheckIcon size={15} />
        ) : (
          <UserPlusIcon size={15} />
        )}
        {label}
      </button>
      {error && <span className="field-error" style={{ fontSize: 11.5 }}>{error}</span>}
    </span>
  );
}
