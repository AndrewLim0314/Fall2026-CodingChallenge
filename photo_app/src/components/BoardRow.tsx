import { useState } from 'react'
import { Link } from 'react-router'
import { api, isOwner } from '../api'
import type { Board } from '../api'
import ErrorMessage from './ErrorMessage'

type Props = {
  board: Board
  /** Owners get rename/delete; everyone else gets a read-only row. */
  editable: boolean
  onChanged: () => void
}

export default function BoardRow({ board, editable, onChanged }: Props) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(board.name)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const handleRename = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === board.name) return setRenaming(false)
    await run(() => api.boards.update(board.id, { name: trimmed }))
    setRenaming(false)
  }

  return (
    <li>
      {renaming ? (
        <>
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
          <button type="button" onClick={handleRename} disabled={busy}>
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setName(board.name)
              setRenaming(false)
            }}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <Link to={`/boards/${board.id}`}>{board.name}</Link>{' '}
          <small className="muted">
            {board.isPublic ? 'public' : 'private'}
            {board.collaboratorCount > 0 && ` · ${board.collaboratorCount} collaborator(s)`}
            {board.tags.length > 0 && ` · ${board.tags.slice(0, 5).join(', ')}`}
          </small>{' '}
          {editable && (
            <>
              <button type="button" onClick={() => setRenaming(true)} disabled={busy}>
                Rename
              </button>
              <button
                type="button"
                onClick={() => run(() => api.boards.update(board.id, { isPublic: !board.isPublic }))}
                disabled={busy}
              >
                Make {board.isPublic ? 'private' : 'public'}
              </button>
              {/* Two-step instead of window.confirm, which blocks the page. */}
              {confirmingDelete ? (
                <>
                  <button type="button" className="btn--danger" onClick={() => run(() => api.boards.remove(board.id))} disabled={busy}>
                    Really delete?
                  </button>
                  <button type="button" onClick={() => setConfirmingDelete(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmingDelete(true)} disabled={busy}>
                  Delete
                </button>
              )}
            </>
          )}
          {!editable && isOwner(board) === false && board.shareSlug && <small> · can edit</small>}
        </>
      )}

      {error && <ErrorMessage message={error} />}
    </li>
  )
}
