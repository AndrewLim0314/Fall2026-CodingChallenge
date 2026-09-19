import { request } from './client'
import type { BoardPhoto, DiscoverPhoto, SortOrder } from './types'

export const list = (boardId: string, sort: SortOrder = 'desc') =>
  request<{ photos: BoardPhoto[] }>(`/boards/${boardId}/photos`, { query: { sort } })

/**
 * Takes a DiscoverPhoto unchanged — including its comma-separated `tags` string,
 * which the server normalizes. Responds with the board's re-derived tags.
 */
export const add = (boardId: string, photo: DiscoverPhoto) =>
  request<{ photo: Omit<BoardPhoto, 'addedBy' | 'addedAt'>; boardTags: string[] }>(
    `/boards/${boardId}/photos`,
    { method: 'POST', body: photo },
  )

/** Unlinks the photo from the board; the canonical Photo document survives. */
export const remove = (boardId: string, photoId: string) =>
  request<{ boardTags: string[] }>(`/boards/${boardId}/photos/${photoId}`, { method: 'DELETE' })
