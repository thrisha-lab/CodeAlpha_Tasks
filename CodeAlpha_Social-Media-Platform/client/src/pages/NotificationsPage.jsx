import { useCallback, useEffect, useState } from 'react';
import { notificationService } from '../services/notificationService';
import { getErrorMessage } from '../services/api';
import NotificationItem from '../components/notifications/NotificationItem';
import EmptyState from '../components/common/EmptyState';
import { Loader } from '../components/common/Spinner';
import { BellIcon, CheckIcon } from '../components/icons';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (nextPage = 1) => {
    nextPage === 1 ? setLoading(true) : setLoadingMore(true);
    setError('');
    try {
      const data = await notificationService.getAll(nextPage);
      setNotifications((prev) => (nextPage === 1 ? data.notifications : [...prev, ...data.notifications]));
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
    load(1);
  }, [load]);

  const onRead = (id) =>
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      // Tell the Navbar badge to refresh immediately.
      window.dispatchEvent(new Event('notifications:changed'));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="page page-fade">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="page-heading" style={{ margin: 0 }}>Notifications</div>
        {hasUnread && (
          <button className="btn btn-soft btn-sm" onClick={markAllRead}>
            <CheckIcon size={15} /> Mark all read
          </button>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <Loader label="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <div className="card">
          <EmptyState icon={<BellIcon size={26} />} title="No notifications yet">
            When someone likes or comments on your posts, or follows you, it will show up here.
          </EmptyState>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          {notifications.map((n) => (
            <NotificationItem key={n._id} notification={n} onRead={onRead} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="center-load">
          <button className="btn btn-outline" onClick={() => load(page + 1)} disabled={loadingMore}>
            {loadingMore && <Spinner size="sm" />}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
