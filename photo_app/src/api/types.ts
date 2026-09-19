/**
 * Mirrors the server's serializers — publicUser(), publicBoard(), boardPhoto().
 * Change one of those and the matching type here has to follow.
 */

export type User = {
  id: string
  username: string
  email: string
}

/**
 * The two optional fields are the server telling us what we may do: shareSlug
 * is sent only when we can edit, inviteToken only when we own the board. Their
 * absence is a permission answer, not missing data.
 */
export type Board = {
  id: string
  name: string
  tags: string[]
  isPublic: boolean
  owner: string
  collaboratorCount: number
  createdAt: string
  updatedAt: string
  shareSlug?: string
  inviteToken?: string
}

/** A photo saved on a board. `tags` is an array here, unlike DiscoverPhoto. */
export type BoardPhoto = {
  id: string
  pixabayId: number
  imageUrl: string
  thumbnailUrl: string
  pageUrl: string
  tags: string[]
  /** Tags this board's members added; separate from the shared Pixabay tags. */
  userTags: string[]
  addedBy: string
  /** Populated by the list route; absent if the account no longer exists. */
  addedByUsername?: string
  addedAt: string
}

/**
 * An unsaved Pixabay hit. `tags` is the raw comma-separated string Pixabay
 * sends, kept verbatim so this object can be POSTed straight back when saving;
 * there is no `id` until a Photo document exists.
 */
export type DiscoverPhoto = {
  pixabayId: number
  imageUrl: string
  thumbnailUrl: string
  pageUrl: string
  tags: string
}

/** One search tile: a photo plus every board we're allowed to see it on. */
export type SearchResult = {
  id: string
  pixabayId: number
  imageUrl: string
  thumbnailUrl: string
  pageUrl: string
  tags: string[]
  addedAt: string
  boards: { id: string; name: string; userTags: string[] }[]
}

export type MyBoards = {
  owned: Board[]
  collaborating: Board[]
  saved: Board[]
}

export type SortOrder = 'asc' | 'desc'

export const canEdit = (board: Board) => board.shareSlug !== undefined
export const isOwner = (board: Board) => board.inviteToken !== undefined
