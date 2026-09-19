import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api'
import type { User } from '../api'
import { AuthContext } from './AuthContext'

/**
 * Holds the session-derived user for the whole app. The session cookie is
 * httpOnly, so the browser can't read it — the only way to know who we are is
 * to ask the server, which is what the boot-time me() call does.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const { user } = await api.auth.me()
      setUser(user)
    } catch {
      // A failed check means we can't prove a session, which is the same
      // practical state as logged out.
      setUser(null)
    }
  }, [])

  useEffect(() => {
    // Runs once on load. Under StrictMode this fires twice in dev; me() is a
    // read, so the repeat is harmless.
    let cancelled = false

    api.auth
      .me()
      .then(({ user }) => {
        if (!cancelled) setUser(user)
      })
      .catch(() => {
        // Can't prove a session, which is the same practical state as logged out.
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await api.auth.login({ email, password })
    setUser(user)
    return user
  }, [])

  // The server starts the session here too, so there's no second login step.
  const register = useCallback(
    async (input: { username: string; email: string; password: string }) => {
      const { user } = await api.auth.register(input)
      setUser(user)
      return user
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await api.auth.logout()
    } finally {
      // Clear locally even if the request failed; leaving a stale user on
      // screen after a logout click is worse than a redundant logged-out state.
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, refetch }),
    [user, isLoading, login, register, logout, refetch],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
