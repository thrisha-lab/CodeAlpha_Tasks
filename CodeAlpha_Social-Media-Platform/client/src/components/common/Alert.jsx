import { AlertIcon } from '../icons';

/** Inline error / success banner. */
export default function Alert({ type = 'error', children, onDismiss }) {
  if (!children) return null;
  return (
    <div className={`alert ${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {type === 'error' ? <AlertIcon size={17} /> : null}
      <span style={{ flex: 1 }}>{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" style={{ fontWeight: 700, lineHeight: 1 }}>
          ×
        </button>
      )}
    </div>
  );
}
