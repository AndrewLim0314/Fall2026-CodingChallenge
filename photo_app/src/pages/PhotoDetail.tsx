import { useState } from 'react'
import type { BoardPhoto } from '../api'
import { Link, useNavigate, useParams } from 'react-router'
import { api, canEdit } from '../api'
import ErrorMessage from '../components/ErrorMessage'
import Header from '../components/Header'
import Spinner from '../components/Spinner'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../hooks/useAuth'

/**
 * A single photo, scoped to the board it was found on.
 *
 * There is no GET /api/photos/:id — a Photo is canonical and shared across
 * boards, so "who added it" and "may you remove it" only have answers relative
 * to one board. The photo is picked out of that board's list.
 */
export default function PhotoDetail() {
  const { boardId = '', photoId = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const board = useAsync(() => api.boards.get(boardId), [boardId])
  const photos = useAsync(() => api.boardPhotos.list(boardId), [boardId])

  const loading = board.loading || photos.loading
  if (loading) {
    return (
      <>
        <Header />
        <main className="container">
          <Spinner label="Loading photo…" />
        </main>
      </>
    )
  }

  const failure = board.error ?? photos.error
  const photo = photos.data?.photos.find((p) => p.id === photoId)

  if (failure || !board.data || !photo) {
    return (
      <>
        <Header />
        <main className="container">
          <ErrorMessage message={failure ?? 'That photo is not on this board.'} />
          <Link to={`/boards/${boardId}`}>Back to board</Link>
        </main>
      </>
    )
  }

  const current = board.data.board
  // Flat permissions: any collaborator can remove any photo, not just whoever
  // added it. The server decides; this only mirrors it.
  const writable = canEdit(current)
  const addedByMe = user?.id === photo.addedBy

  const handleRemove = async () => {
    setRemoving(true)
    setError(null)
    try {
      await api.boardPhotos.remove(boardId, photo.id)
      navigate(`/boards/${boardId}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove photo')
      setRemoving(false)
    }
  }

  return (
    <>
      <Header />

      <main className="container">
        <Link to={`/boards/${boardId}`}>← {current.name}</Link>

        <img
          src={photo.imageUrl}
          alt={photo.tags.join(', ')}
          className="photo-full"
          style={{ width: '100%', display: 'block', borderRadius: 8, margin: '1rem 0' }}
        />

        <p>{photo.tags.join(', ')}</p>
        <p className="muted">From Pixabay — shared by every board with this photo.</p>

        <UserTags
          boardId={boardId}
          photo={photo}
          editable={writable}
          onSaved={(userTags) =>
            photos.setData((current) =>
              current
                ? {
                    photos: current.photos.map((p) =>
                      p.id === photo.id ? { ...p, userTags } : p,
                    ),
                  }
                : current,
            )
          }
        />

        <p>
          <small className="muted">
            {addedByMe ? 'Added by you' : `Added by ${photo.addedByUsername ?? 'a collaborator'}`} on{' '}
            {new Date(photo.addedAt).toLocaleDateString()}
          </small>
        </p>

        <p>
          <a href={photo.pageUrl} target="_blank" rel="noreferrer">
            View on Pixabay
          </a>
        </p>

        {error && <ErrorMessage message={error} />}

        {writable && (
          <button type="button" className="btn--danger" onClick={handleRemove} disabled={removing}>
            {removing ? 'Removing…' : 'Remove from board'}
          </button>
        )}
      </main>
    </>
  )
}

/** Your tags for this photo on this board. Any collaborator may edit them. */
function UserTags({
  boardId,
  photo,
  editable,
  onSaved,
}: {
  boardId: string
  photo: BoardPhoto
  editable: boolean
  onSaved: (userTags: string[]) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(photo.userTags.join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const { userTags } = await api.boardPhotos.setTags(
        boardId,
        photo.id,
        draft.split(',').map((t) => t.trim()).filter(Boolean),
      )
      onSaved(userTags)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save tags')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <section className="panel stack">
        <label htmlFor="usertags">Your tags for this board</label>
        <input
          id="usertags"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="vacation, living room"
        />
        <div className="row">
          <button type="button" className="btn--primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save tags'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(photo.userTags.join(', '))
              setEditing(false)
            }}
          >
            Cancel
          </button>
        </div>
        {error && <ErrorMessage message={error} />}
      </section>
    )
  }

  return (
    <section className="panel row">
      <span>
        <strong>Your tags: </strong>
        {photo.userTags.length > 0 ? photo.userTags.join(', ') : <span className="muted">none yet</span>}
      </span>
      {editable && (
        <button type="button" className="spacer" onClick={() => setEditing(true)}>
          {photo.userTags.length > 0 ? 'Edit tags' : 'Add tags'}
        </button>
      )}
    </section>
  )
}
