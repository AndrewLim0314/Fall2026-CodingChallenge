import { Link } from 'react-router'
import { api } from '../api'
import EmptyState from '../components/EmptyState'
import ErrorMessage from '../components/ErrorMessage'
import Header from '../components/Header'
import Spinner from '../components/Spinner'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../hooks/useAuth'

/** Browse other people's public boards. Your own are filtered out — they're on /boards. */
export default function DiscoverBoards() {
  const { user } = useAuth()
  const boards = useAsync(() => api.boards.discover(), [])

  const others = (boards.data?.boards ?? []).filter((b) => b.owner !== user?.id)

  return (
    <>
      <Header />

      <main className="container">
        <h1>Discover boards</h1>
        <p className="muted">Public boards from other people. Open one to bookmark it.</p>

        {boards.loading && <Spinner label="Loading boards…" />}
        {boards.error && <ErrorMessage message={boards.error} onRetry={boards.reload} />}

        {!boards.loading && !boards.error && others.length === 0 && (
          <EmptyState title="No public boards yet">
            <p>
              Once other people make a board public it shows up here.{' '}
              <Link to="/boards">Make one of yours public</Link> to share it.
            </p>
          </EmptyState>
        )}

        {others.length > 0 && (
          <ul className="board-list">
            {others.map((board) => (
              <li key={board.id}>
                <Link to={`/boards/${board.id}`}>{board.name}</Link>{' '}
                <small className="muted">
                  {/* Board names are unique per owner, not globally, so the
                      owner is part of identifying a board, not decoration. */}
                  by {board.ownerUsername ?? 'someone'}
                  {board.collaboratorCount > 0 && ` · ${board.collaboratorCount} collaborator(s)`}
                  {board.tags.length > 0 && ` · ${board.tags.slice(0, 5).join(', ')}`}
                </small>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
