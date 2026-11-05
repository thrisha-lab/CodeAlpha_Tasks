import { Link } from 'react-router-dom';
import Avatar from '../common/Avatar';
import FollowButton from './FollowButton';
import { truncate } from '../../utils/format';

/** Row card for user lists (search results, followers, following). */
export default function UserCard({ user, onFollowChange }) {
  return (
    <div className="card user-card page-fade">
      <Link to={`/profile/${user.username}`} aria-label={`${user.name}'s profile`}>
        <Avatar user={user} size="md" />
      </Link>
      <div className="info">
        <div className="name">
          <Link to={`/profile/${user.username}`} className="username-link">
            {user.name}
          </Link>
        </div>
        <Link to={`/profile/${user.username}`} className="handle handle-link">
          @{user.username}
        </Link>
        {user.bio && <div className="bio">{truncate(user.bio, 64)}</div>}
      </div>
      <FollowButton target={user} onChange={(delta, following, followersCount) => onFollowChange?.(user._id, { isFollowing: following, followersCount })} />
    </div>
  );
}
