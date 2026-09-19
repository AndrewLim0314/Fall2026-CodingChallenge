import { request } from './client'
import type { Board, MyBoards } from './types'

/** Every public board, newest activity first. */
export const discover = () => request<{ boards: Board[] }>('/boards/discover')

export const create = (input: { name: string; isPublic?: boolean }) =>
  request<{ board: Board }>('/boards', { method: 'POST', body: input })

export const get = (id: string) => request<{ board: Board }>(`/boards/${id}`)

export const update = (id: string, input: { name?: string; isPublic?: boolean }) =>
  request<{ board: Board }>(`/boards/${id}`, { method: 'PATCH', body: input })

export const remove = (id: string) => request<null>(`/boards/${id}`, { method: 'DELETE' })

/** Share-link view. Works on private boards — holding the slug is its own grant. */
export const getBySlug = (shareSlug: string) => request<{ board: Board }>(`/b/${shareSlug}`)

/** Bookmarks someone else's board; it is not a copy. */
export const save = (id: string) => request<null>(`/boards/${id}/save`, { method: 'POST' })

export const unsave = (id: string) => request<null>(`/boards/${id}/save`, { method: 'DELETE' })

export const myBoards = () => request<MyBoards>('/me/boards')
