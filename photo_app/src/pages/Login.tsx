import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api'
import ErrorMessage from '../components/ErrorMessage'
import Spinner from '../components/Spinner'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { user, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Where ProtectedRoute bounced us from, so login returns us there.
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (isLoading) return <Spinner label="Checking your session…" />
  if (user) return <Navigate to={from} replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      // The server sends one identical message for unknown-email and wrong
      // password on purpose, so there is nothing more specific to show.
      setError(err instanceof ApiError ? err.message : 'Could not log in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="container container--narrow">
      <h1>Log in</h1>

      <form className="form" onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <ErrorMessage message={error} />}

        <button type="submit" className="btn--primary" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p>
        No account? <Link to="/register">Register</Link>
      </p>
    </main>
  )
}
