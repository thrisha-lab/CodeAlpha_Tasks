import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../common/Avatar';
import { Spinner } from '../common/Spinner';
import { commentService } from '../../services/commentService';
import { getErrorMessage } from '../../services/api';
import { timeAgo } from '../../utils/format';
import { SendIcon, TrashIcon } from '../icons';

const MAX_CHARS = 300;

/**
 * Comments for a post: list (oldest first), inline add form,
 * delete for own comments. Loaded once when expanded.
 */
export default function CommentSection({ postId, me, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    commentService
      .getForPost(postId)
      .then((data) => alive && setComments(data.comments))
      .catch((err) => alive && setError(getErrorMessage(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [postId]);

  const submit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const comment = await commentService.create(postId, value);
      setComments((prev) => [...prev, comment]);
      setText('');
      onCountChange?.(1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    setError('');
    try {
      await commentService.remove(id);
      setComments((prev) => prev.filter((c) => c._id !== id));
      onCountChange?.(-1);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="comments">
      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="center-load" style={{ padding: 14 }}>
          <Spinner size="sm" />
        </div>
      ) : comments.length === 0 ? (
        <p className="muted small" style={{ margin: '4px 0 8px' }}>
          No comments yet — start the conversation.
        </p>
      ) : (
        comments.map((c) => (
          <div className="comment" key={c._id}>
            <Link to={`/profile/${c.author.username}`} aria-label={`${c.author.name}'s profile`}>
              <Avatar user={c.author} size="sm" />
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="comment-bubble">
                <Link to={`/profile/${c.author.username}`} className="username-link" style={{ fontSize: 13.5 }}>
                  {c.author.name}
                </Link>{' '}
                {c.text}
              </div>
              <div className="comment-meta">
                <span>{timeAgo(c.createdAt)}</span>
                {String(c.author._id) === String(me._id) && (
                  <button onClick={() => remove(c._id)} aria-label="Delete comment">
                    <TrashIcon size={13} /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      <form className="comment-form" onSubmit={submit}>
        <input
          className="input"
          placeholder="Write a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_CHARS}
          aria-label="Write a comment"
        />
        <button className="send-btn" type="submit" disabled={!text.trim() || submitting} aria-label="Send comment">
          {submitting ? <Spinner size="sm" light /> : <SendIcon size={17} />}
        </button>
      </form>
    </div>
  );
}
