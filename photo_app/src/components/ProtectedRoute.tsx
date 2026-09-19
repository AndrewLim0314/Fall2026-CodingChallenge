import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import Spinner from './Spinner'

/**
 * Gate for logged-in-only routes. This is a UX convenience, not a security
 * boundary — every real permission check happens server-side.
 */
export default function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  // Without this, a refresh would bounce a logged-in user to /login during the
  // moment before the session check resolves.
  if (isLoading) {
    return (
      <main className="container">
        <Spinner label="Checking your session…" />
      </main>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  return <Outlet />
}
