import { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../common/Avatar';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import ConfirmDialog from '../common/ConfirmDialog';
import CommentSection from './CommentSection';
import { postService } from '../../services/postService';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl, timeAgo } from '../../utils/format';
import { AlertIcon, CommentIcon, EditIcon, HeartIcon, MoreIcon, TrashIcon } from '../icons';

/**
 * Single post card: author, content, image, like & comment actions,
 * edit/delete menu for the author, expandable comments.
 */
export default function PostCard({ post, onChanged, onDeleted, autoOpenComments = false }) {
  const { user: me } = useAuth();

  const [liked, setLiked] = useState(!!post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentsOpen, setCommentsOpen] = useState(autoOpenComments);
  const [commentCount, setCommentCount] = useState(post.commentCount);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const author = post.author;
  const isOwn = String(author?._id) === String(me?._id);

  /* ---------------- Like (optimistic with rollback) ---------------- */
  const toggleLike = async () => {
    const prev = { liked, likeCount };
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    try {
      const res = nextLiked ? await postService.like(post._id) : await postService.unlike(post._id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch (err) {
      setLiked(prev.liked);
      setLikeCount(prev.likeCount);
      setError(getErrorMessage(err));
    }
  };

  /* ---------------- Edit ---------------- */
  const saveEdit = async () => {
    if (!editText.trim()) return;
    setSaving(true);
    setError('');
    try {
      const updated = await postService.update(post._id, editText.trim());
      onChanged?.(updated);
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- Delete ---------------- */
  const doDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await postService.remove(post._id);
      setConfirmDelete(false);
      onDeleted?.(post._id);
    } catch (err) {
      setError(getErrorMessage(err));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="card post-card page-fade">
      <div className="post-header">
        <Link to={`/profile/${author.username}`} aria-label={`${author.name}'s profile`}>
          <Avatar user={author} size="md" />
        </Link>
        <div className="who">
          <div className="name-row">
            <Link to={`/profile/${author.username}`} className="username-link">
              {author.name}
            </Link>
            <Link to={`/profile/${author.username}`} className="handle handle-link">
              @{author.username}
            </Link>
          </div>
          <span className="time" title={new Date(post.createdAt).toLocaleString()}>
            {timeAgo(post.createdAt)}
          </span>
        </div>

        {isOwn && (
          <div className="post-menu-wrap">
            <button
              className="btn-icon"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Post options"
            >
              <MoreIcon size={18} />
            </button>
            {menuOpen && (
              <div className="menu" role="menu" onMouseLeave={() => setMenuOpen(false)}>
                <button
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditText(post.content);
                    setEditing(true);
                  }}
                >
                  <EditIcon size={16} /> Edit post
                </button>
                <button
                  className="menu-item danger"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                >
                  <TrashIcon size={16} /> Delete post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="alert error" style={{ marginTop: 10 }}>
          <AlertIcon size={16} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="post-content">{post.content}</div>

      {post.image && (
        <div className="post-image">
          <a href={getImageUrl(post.image)} target="_blank" rel="noopener noreferrer">
            <img
              src={getImageUrl(post.image)}
              alt="Post attachment"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.closest('.post-image').style.display = 'none';
              }}
            />
          </a>
        </div>
      )}

      <div className="post-actions">
        <button
          className={`action-btn like${liked ? ' liked' : ''}`}
          onClick={toggleLike}
          aria-pressed={liked}
          aria-label={liked ? 'Unlike post' : 'Like post'}
        >
          <HeartIcon size={19} filled={liked} />
          <span>{likeCount}</span>
        </button>
        <button
          className="action-btn comment"
          onClick={() => setCommentsOpen((o) => !o)}
          aria-expanded={commentsOpen}
          aria-label="Toggle comments"
        >
          <CommentIcon size={19} />
          <span>{commentCount}</span>
        </button>
      </div>

      {commentsOpen && (
        <CommentSection
          postId={post._id}
          me={me}
          onCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
        />
      )}

      {editing && (
        <Modal
          title="Edit post"
          onClose={() => setEditing(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving || !editText.trim()}>
                {saving && <Spinner size="sm" light />}
                Save changes
              </button>
            </>
          }
        >
          <textarea
            className="textarea"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            maxLength={1000}
            rows={5}
            autoFocus
            aria-label="Edit post content"
          />
          <div className="char-count">{1000 - editText.length}</div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this post?"
          message="The post, its likes and its comments will be permanently removed."
          busy={deleting}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </article>
  );
}
