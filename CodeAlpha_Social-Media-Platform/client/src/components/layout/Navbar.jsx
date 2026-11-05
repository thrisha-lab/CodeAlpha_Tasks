import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import Avatar from '../common/Avatar';
import ConfirmDialog from '../common/ConfirmDialog';
import {
  BellIcon,
  ChatLogoIcon,
  HomeIcon,
  LogoutIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
} from '../icons';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const menuRef = useRef(null);

  const refreshUnread = () => {
    notificationService
      .getUnreadCount()
      .then(setUnread)
      .catch(() => {});
  };

  // Poll the unread count + refresh on navigation (e.g. after reading notifications).
  useEffect(() => {
    refreshUnread();
    const interval = setInterval(refreshUnread, 25000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    refreshUnread();
    setMenuOpen(false);
  }, [location.pathname]);

  // Live badge refresh when notifications get read anywhere in the app.
  useEffect(() => {
    const onChange = () => refreshUnread();
    window.addEventListener('notifications:changed', onChange);
    return () => window.removeEventListener('notifications:changed', onChange);
  }, []);

  // Close the profile dropdown on outside click.
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" aria-label="Connectify home">
          <span className="brand-logo">
            <ChatLogoIcon size={19} strokeWidth={2.2} />
          </span>
          <span>Connectify</span>
        </Link>

        <form className="nav-search input-wrap" onSubmit={submitSearch} role="search">
          <span className="input-icon">
            <SearchIcon size={16} />
          </span>
          <input
            className="input"
            type="search"
            placeholder="Search users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search users"
          />
        </form>

        <nav className="nav-actions" aria-label="Main navigation">
          <div className="nav-links-desktop" style={{ display: 'flex', gap: 4 }}>
            <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} aria-label="Feed">
              <HomeIcon size={20} />
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} aria-label="Search">
              <SearchIcon size={20} />
            </NavLink>
          </div>

          <NavLink
            to="/notifications"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
          >
            <BellIcon size={20} />
            {unread > 0 && <span className="nav-badge">{unread > 99 ? '99+' : unread}</span>}
          </NavLink>

          <div className="menu-anchor" ref={menuRef}>
            <button
              className="nav-avatar-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
            >
              <Avatar user={user} size="md" />
            </button>

            {menuOpen && (
              <div className="menu" role="menu">
                <div className="menu-header">
                  <div className="name">{user.name}</div>
                  <div className="username">@{user.username}</div>
                </div>
                <Link className="menu-item" to={`/profile/${user.username}`} role="menuitem">
                  <UserIcon size={17} /> My profile
                </Link>
                <Link className="menu-item" to="/settings/profile" role="menuitem">
                  <SettingsIcon size={17} /> Edit profile
                </Link>
                <div className="menu-divider" />
                <button className="menu-item danger" onClick={() => setConfirmLogout(true)} role="menuitem">
                  <LogoutIcon size={17} /> Log out
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {confirmLogout && (
        <ConfirmDialog
          title="Log out of Connectify?"
          message="You will need to log in again to continue."
          confirmLabel="Log out"
          onConfirm={() => {
            logout();
            navigate('/login');
          }}
          onCancel={() => setConfirmLogout(false)}
        />
      )}
    </header>
  );
}
