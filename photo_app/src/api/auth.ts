import { request } from './client'
import type { User } from './types'

export const register = (input: { username: string; email: string; password: string }) =>
  request<{ user: User }>('/auth/register', { method: 'POST', body: input })

export const login = (input: { email: string; password: string }) =>
  request<{ user: User }>('/auth/login', { method: 'POST', body: input })

export const logout = () => request<null>('/auth/logout', { method: 'POST' })

/** Returns { user: null } rather than 401 when logged out, so it's safe to call on boot. */
export const me = () => request<{ user: User | null }>('/auth/me')
