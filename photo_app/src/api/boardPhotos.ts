import { request } from './client'
import type { BoardPhoto, DiscoverPhoto, SortOrder } from './types'

export const list = (boardId: string, sort: SortOrder = 'desc') =>
  request<{ photos: BoardPhoto[] }>(`/boards/${boardId}/photos`, { query: { sort } })

/**
 * Takes a DiscoverPhoto unchanged — including its comma-separated `tags` string,
 * which the server normalizes. Responds with the board's re-derived tags.
 */
export const add = (boardId: string, photo: DiscoverPhoto) =>
  request<{ photo: Omit<BoardPhoto, 'addedBy' | 'addedAt' | 'userTags'>; boardTags: string[] }>(
    `/boards/${boardId}/photos`,
    { method: 'POST', body: photo },
  )

/** Unlinks the photo from the board; the canonical Photo document survives. */
export const remove = (boardId: string, photoId: string) =>
  request<{ boardTags: string[] }>(`/boards/${boardId}/photos/${photoId}`, { method: 'DELETE' })

/** Replaces this link's user tags. Scoped to the board, not the shared Photo. */
export const setTags = (boardId: string, photoId: string, tags: string[]) =>
  request<{ userTags: string[] }>(`/boards/${boardId}/photos/${photoId}`, {
    method: 'PATCH',
    body: { tags },
  })
