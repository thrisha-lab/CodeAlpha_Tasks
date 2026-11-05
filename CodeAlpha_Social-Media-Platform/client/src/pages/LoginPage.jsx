import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/common/Alert';
import { Spinner } from '../components/common/Spinner';
import { ChatLogoIcon, CheckIcon, LockIcon, MailIcon, SparkIcon, UserIcon } from '../components/icons';

export default function LoginPage() {
  const { user, login, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // "session expired" banner when redirected by the 401 interceptor
  useEffect(() => {
    if (new URLSearchParams(location.search).get('expired')) {
      setError('Your session has expired. Please log in again.');
    }
  }, [location.search]);

  if (!initializing && user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(getErrorMessageLocal(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-hero">
        <div className="brand" style={{ color: '#fff' }}>
          <span className="brand-logo"><ChatLogoIcon size={22} /></span>
          <span>Connectify</span>
        </div>
        <div>
          <h1>Where developers, designers and friends connect.</h1>
          <p>
            A full-stack social platform built with React, Express.js, MongoDB and JWT authentication —
            created as a CodeAlpha Full Stack Development internship project.
          </p>
          <ul className="auth-points">
            <li><span className="pt-icon"><SparkIcon size={14} /></span> Share posts with images</li>
            <li><span className="pt-icon"><CheckIcon size={14} /></span> Like, comment and follow</li>
            <li><span className="pt-icon"><CheckIcon size={14} /></span> Real-time notifications badge</li>
          </ul>
        </div>
        <small style={{ color: 'rgba(255,255,255,0.7)', position: 'relative', zIndex: 1 }}>
          © {new Date().getFullYear()} Connectify — Internship Demo
        </small>
      </aside>

      <main className="auth-form-side">
        <div className="auth-card page-fade">
          <h2>Welcome back</h2>
          <p className="sub">Log in to see what your community is up to.</p>

          <Alert type="error" onDismiss={() => setError('')}>{error}</Alert>

          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="email">Email or username</label>
              <div className="input-wrap">
                <span className="input-icon"><UserIcon size={16} /></span>
                <input
                  id="email"
                  className="input"
                  type="text"
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <span className="input-icon"><LockIcon size={16} /></span>
                <input
                  id="password"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy || !form.email || !form.password}>
              {busy && <Spinner size="sm" light />}
              Log in
            </button>
          </form>

          <div className="demo-box">
            <b>Demo account</b> — try the seeded data instantly:
            <div className="cred">alex@demo.com&nbsp;/&nbsp;Password123</div>
          </div>

          <p className="auth-alt">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function getErrorMessageLocal(err) {
  return err?.response?.data?.message || err?.message || 'Login failed. Please try again.';
}
