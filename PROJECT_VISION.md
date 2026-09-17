Photo Board App — Product Vision
Sep 17, 2026 · @Andrew

A Pinterest-style photo discovery and collecting website: users browse random photos pulled from the Pixabay API, save ones they like into personal boards, and boards carry tags inherited from their photos so anyone can search across all boards by tag. Boards are public by default, can be shared by link, saved by other users, and opened up for collaboration.

## Core Hubs & Navigation

Three main hubs, plus a persistent search bar at the top of every page.

1. **Discover** — an infinite/paginated feed of random photos pulled live from the Pixabay API, with photos the user has already saved filtered out (see Discover Feed Filtering). This is the "explore" surface; photos here aren't tied to any user until someone saves one to a board.
2. **Discover Boards** — browse other users' public boards. Board names are not unique globally (two users can both have a board called "Nature"), but each board is scoped to its owner, so the board card should always show board name + by @username.
3. **Profile** — the logged-in (or viewed) user's username and their boards, split into three sections:
   - **My Boards** — boards this user owns. Full control: rename, delete, add/remove photos, invite collaborators.
   - **Saved Boards** — other people's boards this user has bookmarked. Read-only; they're references, not copies (see Saving vs. Collaborating).
   - **Collaboration Boards** — boards owned by someone else where this user has edit rights. Can add and remove photos, but not rename or delete the board itself.

**Search bar (top nav)** — searches by tag, inclusively (OR logic: a photo matching any searched tag qualifies; refine later to AND/inclusive-vs-exclusive toggle if time allows). Search results are photos, not boards, and each result shows which board(s)/tags it came from.

## Sharing, Saving & Collaborating

Three distinct things that are easy to conflate, so stating them separately:

**Public visibility** — every board is public by default (`isPublic: true`). Public boards appear in Discover Boards and are viewable by anyone at `/boards/:id`. A board can be flipped private, which hides it from Discover Boards and from non-collaborators; the owner and any collaborators can still see it.

**Share link** — every board has a stable, unguessable `shareSlug`. `/b/:shareSlug` opens the board in view mode and works even if the board is private. This is the "send it to a friend" URL; it grants viewing, not editing.

**Collaboration invite** — separate from the share link. The owner generates an invite (`inviteToken`) at `/invite/:inviteToken`; a logged-in user who opens it is added to the board's `collaborators` array and the board shows up under their Collaboration Boards. The owner can revoke the token or remove a collaborator at any time. Keeping invites on a separate token means sharing a board to be *seen* never accidentally hands out edit rights.

**Saving someone else's board** — a bookmark, not a fork. It pushes the board's id onto the saving user's `savedBoards` and it renders under Saved Boards. Because it's a reference, the saver sees the owner's edits live — if the owner deletes a photo, it disappears from the saved view too. (A copy-on-save "fork" would be the alternative, but it doubles storage and goes stale immediately; skip it.) A user can't save their own board, and un-saving is just removing the id.

## Editing

A board is never finished — owners and collaborators add and delete photos continuously, and each change takes effect immediately for everyone viewing that board.

- **Add** — from Discover (or from tag search results) via a "save to board" control that lists the boards the current user can write to: their own plus their collaboration boards.
- **Delete** — removing a photo deletes that Photo document and re-derives the parent board's `tags` (see Tagging).
- **Board-level** — owner only: rename, toggle public/private, delete the board (which deletes its Photo docs and drops it from every user's `savedBoards`).

**Collaborator rights:** any collaborator can add or delete any photo on the board, regardless of who added it. One rule, no per-photo ownership checks — `Photo.addedBy` is kept for attribution/display, not permissions.

Every write is permission-checked server-side against owner-or-collaborator; the UI hiding a button is not a substitute.

## Data Model

| Model | Key fields | Notes |
|---|---|---|
| User | username, email, hashedPassword, savedBoards (array of Board refs) | Already built (session-based auth); savedBoards is the Saved Boards section |
| Board | owner (ref User), name, tags (array, derived), isPublic (default true), shareSlug, inviteToken, collaborators (array of User refs), createdAt | Name unique per owner, not globally. shareSlug and inviteToken are separate random strings |
| Photo | pixabayId, imageUrl, sourceTags (from Pixabay), boardId (ref Board), addedAt, addedBy (ref User) | A photo doc is created when a user saves it to a board — Discover-feed photos live in the API response only, not in Mongo, until saved. addedBy matters on collaboration boards, where it isn't always the owner |
| Tag | Not its own collection — a `String[]` field on Board and Photo | Decided: a dedicated Tag collection only pays off for tag autocomplete or tag-level metadata, neither of which is in scope for the deadline |

**Relationship:** a Board has many Photos; each Photo belongs to exactly one Board (if a user wants the same image in two boards, that's two separate Photo documents, since each carries its own addedAt and addedBy). A Board's `tags` field is the union of all its photos' tags, recomputed whenever a photo is added or removed.

**Indexes:** `Photo.sourceTags` needs an index — the global tag search is a `$in` across every photo in the database and will collection-scan without one. Also index `Board.shareSlug` and `Board.inviteToken` (both are lookup keys), and `Board.owner`.

**Why Photo is its own collection and not embedded in Board:** global cross-board tag search queries photos independently of their parent. Embedding would force a scan over every board to answer it.

**What `Board.tags` is for:** display only — the tag chips on a board card in Discover Boards, so you can tell what a board is about before opening it. Tag *search* queries `Photo.sourceTags` directly (see below). Worth being explicit about, since it's derived data and the temptation is to assume search uses it.

## Tagging & Search Logic

**Tag propagation:** when a photo is saved from Discover into a Board, its Pixabay tags (Pixabay returns a comma-separated tag string per image) are copied onto the new Photo document, then merged into the parent `Board.tags` array (dedup on merge). Deleting a photo re-derives `Board.tags` from the remaining photos rather than leaving stale tags behind.

**Inclusive tag search (OR):** given a search of `["sunset", "beach"]`, return every Photo whose sourceTags array intersects that list at all — `Photo.find({ sourceTags: { $in: searchTags } })`. Same query whether the search comes from the top search bar or a "filter within this board" control.

**Search scope:** results only include photos from boards the requester can see — public boards, plus their own and their collaboration boards. Private boards must not leak into a global tag search.

**Duplicate results:** since each save creates its own Photo doc, one popular Pixabay image saved by 50 users returns 50 near-identical tiles. Group search results by `pixabayId`, showing one tile with a count/attribution of the boards it appears in.

**Two ways to land on the same photo:**
1. Global tag search → flat result grid of matching photos across all visible boards.
2. Open a board → see only that board's photos (no tag filter needed, since a board's contents are already the union of its own tags).

## Discover Feed Filtering

The Discover feed hides photos the user has already saved, so the explore surface only shows things they haven't collected yet.

**"Already saved" means:** the `pixabayId` appears in any board the user owns. Boards they collaborate on or merely bookmarked don't count — those aren't their collection.

**How:** the Pixabay proxy route builds the set of the user's saved `pixabayId`s (`Photo.distinct('pixabayId', { boardId: { $in: usersBoardIds } })`), then drops matches from the Pixabay response before returning it. Filtering happens server-side because the frontend shouldn't need to know the user's whole save history to render a feed.

**Wrinkle — short pages:** filtering after the fetch means a requested page of 20 can come back as 14, and a heavy user could filter out most of a page. Over-fetch from Pixabay (ask for ~1.5x the page size) and trim to the target count before responding, so the grid stays full. Logged-out visitors skip the filter entirely.

## Board Behavior & Sorting

- Opening a board (from Discover Boards, Profile, or a share link) shows its photos sorted by `addedAt`, with a toggle for ascending vs. descending.
- The same sort control applies to tag-search results, sorted by each Photo's own `addedAt`.
- Creating a board only needs a name; `tags` starts empty and fills in as photos are added, `isPublic` defaults true, and `shareSlug` is generated at creation.
- **Duplicate saves:** allowed across different boards (two Photo docs), blocked within the same board — a unique compound guard on `(boardId, pixabayId)`.

## API Shape (in progress — will evolve as routes get built)

Reads:
- `GET /api/boards/:id/photos?sort=asc|desc`
- `GET /api/photos/search?tags=sunset,beach&sort=asc|desc`
- `GET /api/boards/discover` — public boards for the Discover Boards hub
- `GET /api/b/:shareSlug` — board via share link
- `GET /api/discover` — Pixabay proxy for the random feed

Writes:
- `POST /api/boards` · `PATCH /api/boards/:id` · `DELETE /api/boards/:id`
- `POST /api/boards/:id/photos` · `DELETE /api/boards/:id/photos/:photoId`
- `POST /api/boards/:id/save` · `DELETE /api/boards/:id/save` — bookmark/un-bookmark
- `POST /api/boards/:id/invite` — generate/rotate invite token
- `POST /api/invite/:inviteToken` — accept invite, become collaborator
- `DELETE /api/boards/:id/collaborators/:userId` — owner removes a collaborator

**Pixabay key stays server-side.** The random feed and any keyword passthrough go through our own proxy route so the key never ships in the frontend bundle. This also gives us one place to add caching later.

## Open Questions

- [ ] Rotating `shareSlug` to revoke a previously shared link — worth building, or out of scope?

## Resolved

- **Private boards:** yes, but public is the default; the toggle is one boolean plus a filter on the Discover Boards query.
- **Collaborator permissions:** flat — any collaborator can edit anything on the board.
- **Board goes private:** it simply stops being readable by non-collaborators, savers included. The id stays in their `savedBoards` but the board is filtered out of their Saved Boards view. No cleanup pass, no special case — visibility is decided at read time by the same check everywhere.
- **Duplicate saves:** allowed across boards, blocked within a board.
- **Pixabay key:** server-side proxy route, no frontend exposure.
- **Tag collection:** not building one; `String[]` plus an index covers the described scope.
