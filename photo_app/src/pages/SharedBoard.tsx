import { Link, useParams } from 'react-router'
import { api } from '../api'
import EmptyState from '../components/EmptyState'
import ErrorMessage from '../components/ErrorMessage'
import SkeletonGrid from '../components/SkeletonGrid'
import Spinner from '../components/Spinner'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../hooks/useAuth'

/**
 * A board reached by its share slug. Deliberately outside ProtectedRoute:
 * holding the slug is its own grant, so this works logged out.
 */
export default function SharedBoard() {
  const { shareSlug = '' } = useParams()
  const { user } = useAuth()

  const board = useAsync(() => api.boards.getBySlug(shareSlug), [shareSlug])
  const boardId = board.data?.board.id
  const photos = useAsync(
    () => (boardId ? api.boardPhotos.list(boardId) : Promise.resolve({ photos: [] })),
    [boardId ?? ''],
  )

  if (board.loading) {
    return (
      <main className="container">
        <Spinner label="Loading shared board…" />
      </main>
    )
  }

  if (board.error || !board.data) {
    return (
      <main className="container">
        <ErrorMessage message={board.error ?? 'That share link is not valid.'} />
        <Link to={user ? '/feed' : '/login'}>{user ? 'Go to feed' : 'Log in'}</Link>
      </main>
    )
  }

  const current = board.data.board
  const list = photos.data?.photos ?? []

  return (
    <main className="container">
      <p className="muted">Shared board</p>
      <h1>{current.name}</h1>
      {current.tags.length > 0 && <p className="muted">{current.tags.join(', ')}</p>}

      {photos.loading && <SkeletonGrid count={6} />}
      {photos.error && <ErrorMessage message={photos.error} onRetry={photos.reload} />}

      {!photos.loading && list.length === 0 && <EmptyState title="This board has no photos yet" />}

      <div className="grid">
        {list.map((photo) => (
          <figure key={photo.id} className="card">
            <a href={photo.pageUrl} target="_blank" rel="noreferrer">
              <img src={photo.thumbnailUrl} alt={photo.tags.join(', ')} loading="lazy" />
            </a>
            <figcaption className="card__body">
              <p className="card__tags">{photo.tags.join(', ')}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      <p style={{ marginTop: '1.5rem' }}>
        <Link to={user ? '/feed' : '/login'}>{user ? 'Go to your feed' : 'Log in to save boards'}</Link>
      </p>
    </main>
  )
}
