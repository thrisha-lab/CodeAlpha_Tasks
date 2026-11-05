import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { postService } from '../services/postService';
import { getErrorMessage } from '../services/api';
import PostCard from '../components/posts/PostCard';
import { Loader } from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { ArrowLeftIcon, CommentIcon } from '../components/icons';

/** Single post view (target of like/comment notifications). */
export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPost(await postService.get(id));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loader label="Loading post..." />;

  return (
    <div className="page page-fade">
      <div className="detail-top">
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeftIcon size={20} />
        </button>
        <h2>Post</h2>
      </div>

      {error ? (
        <EmptyState icon={<CommentIcon size={26} />} title="Post unavailable">
          {error} — it may have been deleted. <Link to="/" className="link">Back to feed</Link>
        </EmptyState>
      ) : (
        post && (
          <PostCard
            post={post}
            autoOpenComments
            onChanged={(updated) => setPost(updated)}
            onDeleted={() => navigate('/')}
          />
        )
      )}
    </div>
  );
}
