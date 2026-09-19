import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import BoardRow from '../components/BoardRow'
import EmptyState from '../components/EmptyState'
import ErrorMessage from '../components/ErrorMessage'
import Header from '../components/Header'
import Spinner from '../components/Spinner'
import { useAsync } from '../hooks/useAsync'

export default function Boards() {
  const boards = useAsync(() => api.boards.myBoards(), [])

  const [name, setName] = useState('')
  // Boards are public by default, matching the server's own default.
  const [isPublic, setIsPublic] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setCreating(true)
    setCreateError(null)
    try {
      await api.boards.create({ name: trimmed, isPublic })
      setName('')
      setIsPublic(true)
      boards.reload()
    } catch (err) {
      // 409 here means a name collision with one of your own boards.
      setCreateError(err instanceof Error ? err.message : 'Could not create board')
    } finally {
      setCreating(false)
    }
  }

  const owned = boards.data?.owned ?? []
  const collaborating = boards.data?.collaborating ?? []
  const saved = boards.data?.saved ?? []

  return (
    <>
      <Header />

      <main className="container">
        <h1>Boards</h1>

        <form className="form form--inline" onSubmit={handleCreate}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New board name"
            aria-label="New board name"
          />
          <label>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />{' '}
            Public
          </label>
          <button type="submit" className="btn--primary" disabled={creating}>
            {creating ? 'Creating…' : 'Create board'}
          </button>
          {createError && <ErrorMessage message={createError} />}
        </form>

        {boards.loading && <Spinner label="Loading boards…" />}
        {boards.error && <ErrorMessage message={boards.error} onRetry={boards.reload} />}

        {!boards.loading && !boards.error && (
          <>
            <h2>Your boards</h2>
            {owned.length === 0 ? (
              <EmptyState title="No boards yet">
                <p>Create one above to start collecting photos.</p>
              </EmptyState>
            ) : (
              <ul className="board-list">
                {owned.map((board) => (
                  <BoardRow key={board.id} board={board} editable onChanged={boards.reload} />
                ))}
              </ul>
            )}

            {collaborating.length > 0 && (
              <>
                <h2>Collaborating</h2>
                <ul className="board-list">
                  {collaborating.map((board) => (
                    <BoardRow
                      key={board.id}
                      board={board}
                      editable={false}
                      onChanged={boards.reload}
                    />
                  ))}
                </ul>
              </>
            )}

            {saved.length > 0 && (
              <>
                <h2>Saved</h2>
                <ul className="board-list">
                  {saved.map((board) => (
                    <BoardRow
                      key={board.id}
                      board={board}
                      editable={false}
                      onChanged={boards.reload}
                    />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </main>
    </>
  )
}
