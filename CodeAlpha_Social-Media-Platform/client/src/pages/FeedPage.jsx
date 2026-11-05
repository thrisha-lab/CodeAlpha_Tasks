import { useCallback, useEffect, useState } from 'react';
import { postService } from '../services/postService';
import { getErrorMessage } from '../services/api';
import CreatePost from '../components/posts/CreatePost';
import PostsList from '../components/posts/PostsList';
import Alert from '../components/common/Alert';
import EmptyState from '../components/common/EmptyState';
import { CommentIcon } from '../components/icons';

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadFeed = useCallback(async (nextPage = 1) => {
    const isRefresh = nextPage === 1;
    isRefresh ? setLoading(true) : setLoadingMore(true);
    setError('');
    try {
      const data = await postService.getFeed(nextPage, 10);
      setPosts((prev) => (isRefresh ? data.posts : [...prev, ...data.posts]));
      setHasMore(data.hasMore);
      setPage(data.page);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(1);
  }, [loadFeed]);

  const onCreated = (post) => setPosts((prev) => [post, ...prev]);
  const onChanged = (updated) =>
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? { ...p, ...updated } : p)));
  const onDeleted = (id) => setPosts((prev) => prev.filter((p) => p._id !== id));

  return (
    <div className="page page-fade">
      <CreatePost onCreated={onCreated} />
      <Alert type="error" onDismiss={() => setError('')}>{error}</Alert>
      <PostsList
        posts={posts}
        loading={loading}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={() => loadFeed(page + 1)}
        onChanged={onChanged}
        onDeleted={onDeleted}
        emptyIcon={<CommentIcon size={26} />}
        emptyTitle="No posts yet"
        emptyText="Be the first to share something with the community — your post will appear right here."
      />
      <p className="footer-credit">Connectify — React + Express + MongoDB · CodeAlpha Full Stack Internship</p>
    </div>
  );
}
