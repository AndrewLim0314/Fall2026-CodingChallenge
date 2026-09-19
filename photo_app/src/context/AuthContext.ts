import { createContext } from 'react'
import type { User } from '../api'

export type AuthContextValue = {
  user: User | null
  /** True until the initial session check resolves — distinct from "logged out". */
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (input: { username: string; email: string; password: string }) => Promise<User>
  logout: () => Promise<void>
  refetch: () => Promise<void>
}

// Undefined (rather than a default object) so useAuth can tell "no provider
// above me" apart from "provider present, nobody logged in".
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
