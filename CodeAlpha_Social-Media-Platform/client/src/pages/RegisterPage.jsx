import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/common/Alert';
import { Spinner } from '../components/common/Spinner';
import { ChatLogoIcon, CheckIcon, LockIcon, MailIcon, SparkIcon, UserIcon } from '../components/icons';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function RegisterPage() {
  const { user, register, initializing } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [clientErrors, setClientErrors] = useState({});

  if (!initializing && user) return <Navigate to="/" replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const validate = () => {
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!USERNAME_RE.test(form.username))
      errs.username = '3-20 characters; letters, numbers and underscores only';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    setClientErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
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
          <h1>Join the community in under a minute.</h1>
          <p>Create your profile, share updates, follow people you find interesting and see what happens next.</p>
          <ul className="auth-points">
            <li><span className="pt-icon"><SparkIcon size={14} /></span> Free, instant account</li>
            <li><span className="pt-icon"><CheckIcon size={14} /></span> Secure JWT authentication</li>
            <li><span className="pt-icon"><CheckIcon size={14} /></span> Passwords hashed with bcrypt</li>
          </ul>
        </div>
        <small style={{ color: 'rgba(255,255,255,0.7)', position: 'relative', zIndex: 1 }}>
          © {new Date().getFullYear()} Connectify — Internship Demo
        </small>
      </aside>

      <main className="auth-form-side">
        <div className="auth-card page-fade">
          <h2>Create your account</h2>
          <p className="sub">A few details and you're in.</p>

          <Alert type="error" onDismiss={() => setError('')}>{error}</Alert>

          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <div className="input-wrap">
                <span className="input-icon"><UserIcon size={16} /></span>
                <input id="name" className={`input${clientErrors.name ? ' invalid' : ''}`} type="text"
                  placeholder="Ada Lovelace" value={form.name} onChange={set('name')} autoComplete="name" required />
              </div>
              {clientErrors.name && <div className="field-error">{clientErrors.name}</div>}
            </div>

            <div className="field">
              <label htmlFor="username">Username</label>
              <div className="input-wrap">
                <span className="input-icon"><MailIcon size={16} /></span>
                <input id="username" className={`input${clientErrors.username ? ' invalid' : ''}`} type="text"
                  placeholder="ada_lovelace" value={form.username} onChange={set('username')} autoComplete="username" required />
              </div>
              {clientErrors.username ? (
                <div className="field-error">{clientErrors.username}</div>
              ) : (
                <div className="field-hint">This will be your @handle — lowercase letters, numbers and _</div>
              )}
            </div>

            <div className="field">
              <label htmlFor="reg-email">Email</label>
              <div className="input-wrap">
                <span className="input-icon"><MailIcon size={16} /></span>
                <input id="reg-email" className={`input${clientErrors.email ? ' invalid' : ''}`} type="email"
                  placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" required />
              </div>
              {clientErrors.email && <div className="field-error">{clientErrors.email}</div>}
            </div>

            <div className="field">
              <label htmlFor="reg-password">Password</label>
              <div className="input-wrap">
                <span className="input-icon"><LockIcon size={16} /></span>
                <input id="reg-password" className={`input${clientErrors.password ? ' invalid' : ''}`} type="password"
                  placeholder="At least 6 characters" value={form.password} onChange={set('password')} autoComplete="new-password" required />
              </div>
              {clientErrors.password && <div className="field-error">{clientErrors.password}</div>}
            </div>

            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
              {busy && <Spinner size="sm" light />}
              Create account
            </button>
          </form>

          <p className="auth-alt">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
