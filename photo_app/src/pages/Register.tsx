import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { ApiError } from '../api'
import ErrorMessage from '../components/ErrorMessage'
import Spinner from '../components/Spinner'
import { useAuth } from '../hooks/useAuth'

export default function Register() {
  const { user, isLoading, register } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isLoading) return <Spinner label="Checking your session…" />
  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register({ username, email, password })
      // The server started a session as part of registering, so we land on the
      // feed rather than sending them to a login form they no longer need.
      navigate('/', { replace: true })
    } catch (err) {
      // 409 carries which field collided ("That email is already taken"); 400
      // carries the password-length rule. Both are worth showing verbatim.
      setError(err instanceof ApiError ? err.message : 'Could not register')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="container container--narrow">
      <h1>Register</h1>

      <form className="form" onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        {error && <ErrorMessage message={error} />}

        <button type="submit" className="btn--primary" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Register'}
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </main>
  )
}
