/**
 * Namespaced so call sites read like the routes: api.boards.get(id),
 * api.boardPhotos.add(...). Grouped to match the server's controllers.
 */
import * as auth from './auth'
import * as boardPhotos from './boardPhotos'
import * as boards from './boards'
import * as collaborators from './collaborators'
import * as search from './search'

export const api = { auth, boards, boardPhotos, search, collaborators }

export { ApiError } from './client'
export * from './types'
