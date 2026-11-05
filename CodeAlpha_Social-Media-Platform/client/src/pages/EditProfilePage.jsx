import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/common/Avatar';
import Alert from '../components/common/Alert';
import { Spinner } from '../components/common/Spinner';
import { CameraIcon, MailIcon, UserIcon } from '../components/icons';

const MAX_BIO = 160;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function EditProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user.name || '',
    username: user.username || '',
    bio: user.bio || '',
    email: user.email || '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef(null);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const pickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Avatar image is too large. Maximum size is 5MB.');
      return;
    }
    setError('');
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.name.trim().length < 2) return setError('Name must be at least 2 characters');
    if (!USERNAME_RE.test(form.username.trim()))
      return setError('Username must be 3-20 characters (letters, numbers, underscores)');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Please enter a valid email');

    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('username', form.username.trim().toLowerCase());
      formData.append('bio', form.bio.trim());
      formData.append('email', form.email.trim().toLowerCase());
      if (avatarFile) formData.append('avatar', avatarFile);

      const updated = await userService.updateProfile(formData);
      updateUser(updated);
      setSuccess('Profile updated successfully!');
      setTimeout(() => navigate(`/profile/${updated.username}`), 700);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-fade" style={{ maxWidth: 560 }}>
      <div className="page-heading">Edit profile</div>

      <div className="card" style={{ padding: 22 }}>
        <Alert type="error" onDismiss={() => setError('')}>{error}</Alert>
        <Alert type="success" onDismiss={() => setSuccess('')}>{success}</Alert>

        <form onSubmit={submit} noValidate>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            {preview ? (
              <img src={preview} alt="New avatar preview" className="avatar-fallback lg" style={{ objectFit: 'cover' }} />
            ) : (
              <Avatar user={user} size="lg" />
            )}
            <div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={pickAvatar} hidden />
              <button type="button" className="btn btn-soft btn-sm" onClick={() => fileRef.current?.click()}>
                <CameraIcon size={15} /> Change photo
              </button>
              <div className="field-hint">JPG, PNG, GIF or WebP — max 5MB</div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="p-name">Full name</label>
            <div className="input-wrap">
              <span className="input-icon"><UserIcon size={16} /></span>
              <input id="p-name" className="input" value={form.name} onChange={set('name')} maxLength={50} required />
            </div>
          </div>

          <div className="field">
            <label htmlFor="p-username">Username</label>
            <div className="input-wrap">
              <span className="input-icon"><UserIcon size={16} /></span>
              <input id="p-username" className="input" value={form.username} onChange={set('username')} maxLength={20} required />
            </div>
            <div className="field-hint">Changing this updates your @handle and profile URL</div>
          </div>

          <div className="field">
            <label htmlFor="p-email">Email</label>
            <div className="input-wrap">
              <span className="input-icon"><MailIcon size={16} /></span>
              <input id="p-email" className="input" type="email" value={form.email} onChange={set('email')} required />
            </div>
          </div>

          <div className="field">
            <label htmlFor="p-bio">Bio</label>
            <textarea
              id="p-bio"
              className="textarea"
              value={form.bio}
              onChange={set('bio')}
              maxLength={MAX_BIO}
              rows={3}
              placeholder="Tell the community about yourself..."
            />
            <div className="char-count">{MAX_BIO - form.bio.length}</div>
          </div>

          <div className="flex-center" style={{ justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy && <Spinner size="sm" light />}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
