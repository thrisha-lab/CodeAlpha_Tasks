import { useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import { notificationService } from '../../services/notificationService';
import { truncate, timeAgo } from '../../utils/format';
import { CommentIcon, HeartIcon, UserPlusIcon } from '../icons';

const TYPE_CONFIG = {
  like: { icon: <HeartIcon size={17} filled />, cls: 'like', verb: 'liked your post' },
  comment: { icon: <CommentIcon size={17} />, cls: 'comment', verb: 'commented on your post' },
  follow: { icon: <UserPlusIcon size={17} />, cls: 'follow', verb: 'started following you' },
};

/** One notification row; clicking navigates to the relevant content. */
export default function NotificationItem({ notification, onRead }) {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.like;
  const n = notification;
  const senderName = n.sender?.name || 'Someone';

  const go = async () => {
    if (!n.read) {
      onRead?.(n._id);
      notificationService.markRead(n._id).catch(() => {});
      // Tell the Navbar badge to refresh immediately.
      window.dispatchEvent(new Event('notifications:changed'));
    }
    if (n.type === 'follow' && n.sender?.username) {
      navigate(`/profile/${n.sender.username}`);
    } else if (n.post?._id) {
      navigate(`/post/${n.post._id}`);
    }
  };

  return (
    <div
      className={`notif-item${n.read ? '' : ' unread'}`}
      onClick={go}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && go()}
      aria-label={`${senderName} ${config.verb}`}
    >
      <div className={`notif-icon ${config.cls}`}>{config.icon}</div>
      <div className="notif-body">
        <div className="notif-text">
          <b>{senderName}</b> {config.verb}
        </div>
        {n.post?.content && <div className="notif-snippet">"{truncate(n.post.content, 70)}"</div>}
        {n.comment?.text && <div className="notif-snippet">"{truncate(n.comment.text, 70)}"</div>}
        <div className="notif-time">{timeAgo(n.createdAt)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {n.sender && <Avatar user={n.sender} size="sm" />}
        {!n.read && <span className="unread-dot" aria-label="Unread" />}
      </div>
    </div>
  );
}
