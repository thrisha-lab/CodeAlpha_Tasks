import { useRef, useState } from 'react';
import Avatar from '../common/Avatar';
import Alert from '../common/Alert';
import { Spinner } from '../common/Spinner';
import { postService } from '../../services/postService';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ImageIcon, XIcon } from '../icons';

const MAX_CHARS = 1000;

/** Feed composer: text + optional image upload. */
export default function CreatePost({ onCreated }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const remaining = MAX_CHARS - content.length;
  const canPost = content.trim().length > 0 && remaining >= 0 && !busy;

  const pickImage = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 5 * 1024 * 1024) {
      setError('Image is too large. Maximum size is 5MB.');
      return;
    }
    setError('');
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const clearImage = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canPost) return;
    setBusy(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('content', content.trim());
      if (file) formData.append('image', file);
      const post = await postService.create(formData);
      setContent('');
      clearImage();
      onCreated?.(post);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card composer">
      <Alert type="error" onDismiss={() => setError('')}>{error}</Alert>
      <form onSubmit={submit}>
        <div className="composer-row">
          <Avatar user={user} size="md" />
          <div className="composer-main">
            <textarea
              className="textarea"
              placeholder={`What's on your mind, ${user.name.split(' ')[0]}?`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={MAX_CHARS + 50}
              rows={2}
              aria-label="Write a post"
            />
            {preview && (
              <div className="image-preview">
                <img src={preview} alt="Selected preview" />
                <button type="button" className="remove" onClick={clearImage} aria-label="Remove image">
                  <XIcon size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="composer-footer">
          <div className="composer-tools">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={pickImage}
              hidden
              aria-hidden="true"
            />
            <button
              type="button"
              className="btn-icon"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach an image"
              title="Add image (max 5MB)"
            >
              <ImageIcon size={20} />
            </button>
          </div>
          <div className="flex-center">
            <span className={`char-count${remaining < 0 ? ' over' : ''}`} style={{ marginRight: 10 }}>
              {remaining}
            </span>
            <button className="btn btn-primary" type="submit" disabled={!canPost}>
              {busy && <Spinner size="sm" light />}
              Post
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
