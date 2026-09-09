export function LoadingState({ label = 'Preparing your practice space…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <p>{label}</p>
    </div>
  );
}
