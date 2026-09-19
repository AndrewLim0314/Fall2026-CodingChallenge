import { request } from './client'
import type { Collaborator } from './types'

/** Owner-only: who can currently edit this board. */
export const list = (boardId: string) =>
  request<{ collaborators: Collaborator[] }>(`/boards/${boardId}/collaborators`)

/**
 * Owner-only. `rotate` mints a new token, which invalidates the old link and
 * clears the revoked list — a new link is a new grant.
 */
export const invite = (boardId: string, rotate = false) =>
  request<{ inviteToken: string }>(`/boards/${boardId}/invite`, {
    method: 'POST',
    query: { rotate: rotate ? 'true' : undefined },
  })

/** Redeems an invite link, joining the board as a collaborator. */
export const accept = (inviteToken: string) =>
  request<{ board: { id: string; name: string } }>(`/invite/${inviteToken}`, { method: 'POST' })

export const revoke = (boardId: string, userId: string) =>
  request<null>(`/boards/${boardId}/collaborators/${userId}`, { method: 'DELETE' })
