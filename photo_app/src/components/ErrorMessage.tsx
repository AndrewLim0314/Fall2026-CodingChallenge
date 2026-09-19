/** The single error presentation, with an optional retry. */
export default function ErrorMessage({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <p className="error" role="alert">
      {message}{' '}
      {onRetry && (
        <button type="button" className="btn--link" onClick={onRetry}>
          Retry
        </button>
      )}
    </p>
  )
}
