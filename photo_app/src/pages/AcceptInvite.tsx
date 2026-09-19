import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { api } from '../api'
import ErrorMessage from '../components/ErrorMessage'
import Spinner from '../components/Spinner'

/** Redeems an invite link, then drops the user on the board. */
export default function AcceptInvite() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  // StrictMode double-invokes effects in dev; accepting twice is harmless but
  // the second call races the redirect, so it's guarded.
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    api.collaborators
      .accept(token)
      .then(({ board }) => navigate(`/boards/${board.id}`, { replace: true }))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not accept this invite')
      })
  }, [token, navigate])

  return (
    <main className="container">
      {error ? (
        <>
          <ErrorMessage message={error} />
          <Link to="/boards">Back to your boards</Link>
        </>
      ) : (
        <Spinner label="Accepting invite…" />
      )}
    </main>
  )
}
