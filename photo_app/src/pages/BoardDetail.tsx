import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { api, canEdit, isOwner } from '../api'
import type { SortOrder } from '../api'
import EmptyState from '../components/EmptyState'
import ErrorMessage from '../components/ErrorMessage'
import Header from '../components/Header'
import SkeletonGrid from '../components/SkeletonGrid'
import Spinner from '../components/Spinner'
import { useAsync } from '../hooks/useAsync'

export default function BoardDetail() {
  const { id = '' } = useParams()
  const [sort, setSort] = useState<SortOrder>('desc')
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const board = useAsync(() => api.boards.get(id), [id])
  const photos = useAsync(() => api.boardPhotos.list(id, sort), [id, sort])
  const mine = useAsync(() => api.boards.myBoards(), [])

  const handleRemove = async (photoId: string) => {
    setRemoving(photoId)
    setError(null)
    try {
      await api.boardPhotos.remove(id, photoId)
      photos.setData((current) =>
        current ? { photos: current.photos.filter((p) => p.id !== photoId) } : current,
      )
      // Removing a photo re-derives the board's tags, so refetch the board too.
      board.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove photo')
    } finally {
      setRemoving(null)
    }
  }

  const act = async (action: () => Promise<unknown>, after?: () => void) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      after?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
    } catch {
      // Clipboard access can be denied; the link stays visible to copy by hand.
      setCopied(null)
    }
  }

  if (board.loading) {
    return (
      <>
        <Header />
        <main className="container">
          <Spinner label="Loading board…" />
        </main>
      </>
    )
  }

  // loadBoard() answers 404 rather than 403 when you may not view a board, so a
  // private board never confirms its own existence.
  if (board.error || !board.data) {
    return (
      <>
        <Header />
        <main className="container">
          <ErrorMessage message={board.error ?? 'Board not found'} />
          <Link to="/boards">Back to boards</Link>
        </main>
      </>
    )
  }

  const current = board.data.board
  const writable = canEdit(current)
  const owner = isOwner(current)
  const list = photos.data?.photos ?? []
  const bookmarked = (mine.data?.saved ?? []).some((b) => b.id === current.id)

  return (
    <>
      <Header />

      <main className="container">
        <Link to="/boards">← Boards</Link>

        <h1>{current.name}</h1>
        <p className="muted">
          {current.isPublic ? 'public' : 'private'}
          {current.collaboratorCount > 0 && ` · ${current.collaboratorCount} collaborator(s)`}
          {current.tags.length > 0 && ` · ${current.tags.join(', ')}`}
        </p>

        {error && <ErrorMessage message={error} />}

        <div className="row">
          <label>
            Sort{' '}
            <select value={sort} onChange={(e) => setSort(e.target.value as SortOrder)}>
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>

          {/* shareSlug is only sent to people who can edit. */}
          {writable && current.shareSlug && (
            <button
              type="button"
              onClick={() =>
                copy(`${window.location.origin}/b/${current.shareSlug}`, 'Share link copied')
              }
            >
              Copy share link
            </button>
          )}

          {/* Bookmarking your own board is a 400, so only offer it on others'. */}
          {!owner &&
            (bookmarked ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => act(() => api.boards.unsave(current.id), mine.reload)}
              >
                Remove bookmark
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => act(() => api.boards.save(current.id), mine.reload)}
              >
                Bookmark this board
              </button>
            ))}
        </div>

        {copied && <p className="muted">{copied}</p>}

        {owner && <InvitePanel board={current} />}

        {photos.loading && <SkeletonGrid count={6} />}
        {photos.error && <ErrorMessage message={photos.error} onRetry={photos.reload} />}

        {!photos.loading && !photos.error && list.length === 0 && (
          <EmptyState title="No photos on this board yet">
            <p>
              <Link to="/feed">Find some in the feed</Link>
            </p>
          </EmptyState>
        )}

        {list.length > 0 && (
          <div className="grid">
            {list.map((photo) => (
              <figure key={photo.id} className="card">
                <Link to={`/boards/${id}/photos/${photo.id}`}>
                  <img src={photo.thumbnailUrl} alt={photo.tags.join(', ')} loading="lazy" />
                </Link>
                <figcaption className="card__body">
                  <p className="card__tags">{photo.tags.join(', ')}</p>
                  {writable && (
                    <button
                      type="button"
                      className="btn--danger"
                      onClick={() => handleRemove(photo.id)}
                      disabled={removing === photo.id}
                    >
                      {removing === photo.id ? 'Removing…' : 'Remove'}
                    </button>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </main>
    </>
  )
}

/** Owner-only. inviteToken is present exactly when the viewer owns the board. */
function InvitePanel({ board }: { board: { id: string; inviteToken?: string } }) {
  const [token, setToken] = useState(board.inviteToken ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const link = `${window.location.origin}/invite/${token}`

  const rotate = async () => {
    setBusy(true)
    setError(null)
    try {
      // A new token is a new grant: it invalidates the old link and clears the
      // revoked list server-side.
      const { inviteToken } = await api.collaborators.invite(board.id, true)
      setToken(inviteToken)
      setCopied(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rotate the invite link')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel stack">
      <strong>Invite collaborators</strong>
      <p className="muted">Anyone with this link can add and remove photos.</p>
      <code className="token">{link}</code>
      <div className="row">
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true), () => setCopied(false))}
        >
          Copy invite link
        </button>
        <button type="button" onClick={rotate} disabled={busy}>
          {busy ? 'Rotating…' : 'Rotate link'}
        </button>
        {copied && <span className="muted">Copied</span>}
      </div>
      {error && <ErrorMessage message={error} />}
    </section>
  )
}
