import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from './Navbar';
import { Loader } from '../common/Spinner';
import { BellIcon, HomeIcon, SearchIcon, UserIcon } from '../icons';

/** Mobile bottom tab bar. */
function BottomNav() {
  const { user } = useAuth();
  const item = ({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`;
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <div className="bottom-nav-inner">
        <NavLink to="/" end className={item} aria-label="Feed">
          <HomeIcon size={21} />
          Home
        </NavLink>
        <NavLink to="/search" className={item} aria-label="Search">
          <SearchIcon size={21} />
          Search
        </NavLink>
        <NavLink to="/notifications" className={item} aria-label="Notifications">
          <BellIcon size={21} />
          Alerts
        </NavLink>
        <NavLink to={`/profile/${user?.username}`} className={item} aria-label="My profile">
          <UserIcon size={21} />
          Profile
        </NavLink>
      </div>
    </nav>
  );
}

/**
 * Protected layout shell. Renders the navbar + routed page for
 * authenticated users; unauthenticated visitors are redirected to /login.
 */
export default function Layout() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (initializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loader label="Starting Connectify..." />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
