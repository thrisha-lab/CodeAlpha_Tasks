import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { userService } from '../services/userService';
import { getErrorMessage } from '../services/api';
import UserCard from '../components/users/UserCard';
import EmptyState from '../components/common/EmptyState';
import { Loader } from '../components/common/Spinner';
import useDebounce from '../hooks/useDebounce';
import { SearchIcon, UsersIcon } from '../components/icons';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debouncedQuery = useDebounce(query.trim(), 350);

  useEffect(() => {
    const q = debouncedQuery;
    if (!q) {
      setResults([]);
      setSearched(false);
      setError('');
      if (searchParams.get('q')) setSearchParams({}, { replace: true });
      return;
    }
    let alive = true;
    setLoading(true);
    setError('');
    userService
      .search(q)
      .then((users) => {
        if (!alive) return;
        setResults(users);
        setSearched(true);
        if (searchParams.get('q') !== q) setSearchParams({ q }, { replace: true });
      })
      .catch((err) => alive && setError(getErrorMessage(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const onFollowChange = (userId, patch) =>
    setResults((prev) => prev.map((u) => (u._id === userId ? { ...u, ...patch } : u)));

  return (
    <div className="page page-fade">
      <div className="page-heading">Search users</div>

      <div className="input-wrap" style={{ marginBottom: 18 }}>
        <span className="input-icon"><SearchIcon size={17} /></span>
        <input
          className="input"
          style={{ padding: '12px 16px 12px 42px', borderRadius: 'var(--r-full)' }}
          type="search"
          placeholder="Search by name or @username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          aria-label="Search users by name or username"
        />
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <Loader label="Searching..." />
      ) : !searched ? (
        <EmptyState icon={<SearchIcon size={26} />} title="Find people on Connectify">
          Type a name or an @username above — results appear instantly as you type.
        </EmptyState>
      ) : results.length === 0 ? (
        <EmptyState icon={<UsersIcon size={26} />} title={`No results for "${debouncedQuery}"`}>
          Double-check the spelling or try a different name or username.
        </EmptyState>
      ) : (
        results.map((user) => <UserCard key={user._id} user={user} onFollowChange={onFollowChange} />)
      )}
    </div>
  );
}
