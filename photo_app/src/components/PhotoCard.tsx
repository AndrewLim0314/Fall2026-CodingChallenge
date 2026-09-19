import { useState } from 'react'
import type { Board, DiscoverPhoto } from '../api'
import ErrorMessage from './ErrorMessage'

type Props = {
  photo: DiscoverPhoto
  boards: Board[]
  onSave: (photo: DiscoverPhoto, boardId: string) => Promise<void>
}

/** One feed tile, with its own save control and its own error state. */
export default function PhotoCard({ photo, boards, onSave }: Props) {
  const [boardId, setBoardId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Boards can finish loading after the feed does, so the default is resolved
  // at render rather than captured at mount — otherwise the untouched select
  // shows a board while its state is still '' and Save silently does nothing.
  const selected = boardId || boards[0]?.id || ''

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      await onSave(photo, selected)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  return (
    <figure className="card">
      <a href={photo.pageUrl} target="_blank" rel="noreferrer">
        <img src={photo.thumbnailUrl} alt={photo.tags} loading="lazy" />
      </a>

      <figcaption className="card__body">
        <p className="card__tags">{photo.tags}</p>

        {boards.length > 0 && (
          <div className="row">
            <select
              value={selected}
              onChange={(e) => setBoardId(e.target.value)}
              disabled={saving}
              aria-label="Board to save to"
            >
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}

        {error && <ErrorMessage message={error} />}
      </figcaption>
    </figure>
  )
}
