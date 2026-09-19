/**
 * The one place every API call goes through. Vite proxies /api to :5001, so
 * these stay relative and same-origin.
 */

const BASE = '/api'

/** Carries the HTTP status so callers can branch on 401/403/404 without parsing text. */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type QueryValue = string | number | boolean | undefined | null

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, QueryValue>
  signal?: AbortSignal
}

const buildQuery = (query?: Record<string, QueryValue>) => {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options

  const response = await fetch(BASE + path + buildQuery(query), {
    method,
    // Omit this and the session cookie never rides along, so every call lands
    // anonymous and comes back 401 as if the user were logged out.
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })

  // Several routes (logout, delete, save/unsave, revoke) answer 204 with no body.
  if (response.status === 204) return null as T

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? `Request failed (${response.status})`)
  }

  return data as T
}
