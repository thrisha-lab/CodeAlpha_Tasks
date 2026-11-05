export function Spinner({ size = '', light = false }) {
  return <span className={`spinner ${size} ${light ? 'light' : ''}`} role="status" aria-label="Loading" />;
}

export default Spinner;

/** Centered page-level loader. */
export function Loader({ label = 'Loading...' }) {
  return (
    <div className="center-load" style={{ flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <Spinner size="lg" />
      <span className="muted small">{label}</span>
    </div>
  );
}
