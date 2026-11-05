import { Link } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';
import { SearchIcon } from '../components/icons';

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div>
        <EmptyState icon={<SearchIcon size={26} />} title="404 — Page not found">
          The page you're looking for doesn't exist or has been moved.{' '}
          <Link to="/" className="link">Back to your feed</Link>
        </EmptyState>
      </div>
    </div>
  );
}
