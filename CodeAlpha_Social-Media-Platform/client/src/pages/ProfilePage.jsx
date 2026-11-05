import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { userService } from '../services/userService';
import { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/common/Avatar';
import Alert from '../components/common/Alert';
import EmptyState from '../components/common/EmptyState';
import FollowButton from '../components/users/FollowButton';
import UserCard from '../components/users/UserCard';
import PostsList from '../components/posts/PostsList';
import { Loader } from '../components/common/Spinner';
import { formatCount, formatJoined } from '../utils/format';
import { CalendarIcon, CameraIcon, CommentIcon, SettingsIcon, UsersIcon } from '../components/icons';

const TABS = [
  { key: 'posts', label: 'Posts' },
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' },
];

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me } = useAuth();

  const [profile, setProfile] = useState(null); // { user, isFollowing, isSelf }
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  /* ---------- profile header ---------- */
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setError('');
    try {
      const data = await userService.getProfile(username);
      setProfile(data);
    } catch (err) {
      if (err?.response?.status === 404) setNotFound(true);
      else setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [username]);

  /* ---------- posts tab ---------- */
  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const data = await userService.getPosts(username);
      setPosts(data.posts);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPostsLoading(false);
    }
  }, [username]);

  /* ---------- followers / following tab ---------- */
  const loadUsers = useCallback(
    async (which) => {
      setUsersLoading(true);
      try {
        const data = which === 'followers'
          ? await userService.getFollowers(username)
          : await userService.getFollowing(username);
        setUsers(data.users);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setUsersLoading(false);
      }
    },
    [username]
  );

  useEffect(() => {
    setTab('posts');
    loadProfile();
    loadPosts();
  }, [username, loadProfile, loadPosts]);

  useEffect(() => {
    if (tab === 'followers') loadUsers('followers');
    if (tab === 'following') loadUsers('following');
  }, [tab, loadUsers]);

  /* ---------- actions ---------- */
  const onPostDeleted = (id) => {
    setPosts((prev) => prev.filter((p) => p._id !== id));
    setProfile((p) => ({ ...p, user: { ...p.user, postsCount: Math.max(0, p.user.postsCount - 1) } }));
  };

  const onPostChanged = (updated) =>
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? { ...p, ...updated } : p)));

  const onFollowChange = (delta, following, followersCount) => {
    setProfile((p) => ({
      ...p,
      isFollowing: following,
      user: { ...p.user, followersCount: followersCount ?? Math.max(0, p.user.followersCount + delta) },
    }));
    // refresh the followers list next time the tab opens
    if (tab === 'followers') loadUsers('followers');
  };

  const onListFollowChange = (userId, patch) => {
    setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, ...patch } : u)));
  };

  /* ---------- render ---------- */
  if (loading) return <Loader label="Loading profile..." />;

  if (notFound) {
    return (
      <div className="page">
        <EmptyState icon={<UsersIcon size={26} />} title="User not found">
          No user exists with the username @{username}.{' '}
          <Link to="/" className="link">Back to feed</Link>
        </EmptyState>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page">
        <Alert type="error">{error || 'Something went wrong.'}</Alert>
      </div>
    );
  }

  const u = profile.user;

  return (
    <div className="page page-wide page-fade">
      <div className="card profile-card">
        <div className="profile-banner" />
        <div className="profile-head">
          <Avatar user={u} size="xl" ring alt={`${u.name}'s avatar`} />
          <div className="profile-toprow">
            {profile.isSelf ? (
              <>
                <Link to="/settings/profile" className="btn btn-outline btn-sm">
                  <SettingsIcon size={15} /> Edit profile
                </Link>
                <Link to="/settings/profile" className="btn btn-soft btn-sm" aria-label="Change profile picture">
                  <CameraIcon size={15} /> Photo
                </Link>
              </>
            ) : (
              <FollowButton target={{ ...u, isFollowing: profile.isFollowing, isSelf: false }} onChange={onFollowChange} />
            )}
          </div>
          <div className="profile-id">
            <h1>{u.name}</h1>
            <span className="handle">@{u.username}</span>
          </div>
          {u.bio && <p className="profile-bio">{u.bio}</p>}
          <div className="profile-joined">
            <CalendarIcon size={14} /> Joined {formatJoined(u.createdAt)}
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Profile sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label === 'Posts' && `${formatCount(u.postsCount || 0)} · `}
            {t.label === 'Followers' && `${formatCount(u.followersCount || 0)} · `}
            {t.label === 'Following' && `${formatCount(u.followingCount || 0)} · `}
            {t.label}
          </button>
        ))}
      </div>

      {error && <Alert type="error" onDismiss={() => setError('')}>{error}</Alert>}

      {tab === 'posts' && (
        <PostsList
          posts={posts}
          loading={postsLoading}
          hasMore={false}
          onChanged={onPostChanged}
          onDeleted={onPostDeleted}
          emptyIcon={<CommentIcon size={26} />}
          emptyTitle={profile.isSelf ? "You haven't posted yet" : `@${u.username} hasn't posted yet`}
          emptyText={profile.isSelf ? 'Share your first thought from the feed — it will show up here.' : 'Check back later for new posts.'}
        />
      )}

      {(tab === 'followers' || tab === 'following') &&
        (usersLoading ? (
          <Loader label={tab === 'followers' ? 'Loading followers...' : 'Loading following...'} />
        ) : users.length === 0 ? (
          <EmptyState icon={<UsersIcon size={26} />} title={tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}>
            {profile.isSelf
              ? tab === 'followers'
                ? 'When people follow you, they will appear here.'
                : 'Find interesting people via Search and follow them.'
              : 'Nothing to see here yet.'}
          </EmptyState>
        ) : (
          users.map((usr) => <UserCard key={usr._id} user={usr} onFollowChange={onListFollowChange} />)
        ))}
    </div>
  );
}
