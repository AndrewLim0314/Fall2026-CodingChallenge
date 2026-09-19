import { useState } from 'react'
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
