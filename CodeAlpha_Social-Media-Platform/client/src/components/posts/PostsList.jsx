import PostCard from './PostCard';
import EmptyState from '../common/EmptyState';
import { CommentIcon } from '../icons';

/** Shimmer placeholder shown while the first page loads. */
export function PostSkeleton() {
  return (
    <div className="card skeleton-post" aria-hidden="true">
      <div className="row">
        <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%' }} />
        <div className="lines">
          <div className="skeleton" style={{ width: 150, height: 12 }} />
          <div className="skeleton" style={{ width: 90, height: 10 }} />
        </div>
      </div>
      <div className="lines mt-16" style={{ marginLeft: 54 }}>
        <div className="skeleton" style={{ height: 12 }} />
        <div className="skeleton" style={{ height: 12, width: '70%' }} />
      </div>
    </div>
  );
}

/**
 * Presentational list of posts + pagination.
 * Parent owns the data; this renders states (skeletons / empty / load more).
 */
export default function PostsList({ posts, loading, hasMore, loadingMore, onLoadMore, onChanged, onDeleted, emptyIcon, emptyTitle, emptyText }) {
  if (loading) {
    return (
      <>
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </>
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState icon={emptyIcon} title={emptyTitle}>
        {emptyText}
      </EmptyState>
    );
  }

  return (
    <>
      {posts.map((post) => (
        <PostCard key={post._id} post={post} onChanged={onChanged} onDeleted={onDeleted} />
      ))}

      {hasMore && (
        <div className="center-load">
          <button className="btn btn-outline" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore && <Spinner size="sm" />}
            Load more posts
          </button>
        </div>
      )}
    </>
  );
}
