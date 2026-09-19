/** The single loading indicator for every async page. */
export default function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="spinner" role="status" aria-live="polite">
      {label}
    </p>
  )
}
