import { request } from './client'
import type { DiscoverPhoto, SearchResult, SortOrder } from './types'

/**
 * Tag search across every board we can see. The server wants one
 * comma-separated `tags` param and 400s when it's empty.
 */
export const searchPhotos = (tags: string[], sort: SortOrder = 'desc', signal?: AbortSignal) =>
  request<{ results: SearchResult[] }>('/photos/search', {
    query: { tags: tags.join(','), sort },
    signal,
  })

/** Pixabay proxy — the key stays server-side. Photos already saved are filtered out. */
export const discoverPhotos = (
  options: { q?: string; page?: number } = {},
  signal?: AbortSignal,
) => request<{ photos: DiscoverPhoto[] }>('/discover', { query: { ...options }, signal })
