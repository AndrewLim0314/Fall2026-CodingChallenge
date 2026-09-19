import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { api } from '../api'
import type { SortOrder } from '../api'
import EmptyState from '../components/EmptyState'
import ErrorMessage from '../components/ErrorMessage'
import Header from '../components/Header'
import SkeletonGrid from '../components/SkeletonGrid'
import { useAsync } from '../hooks/useAsync'

export default function Search() {
  const [draft, setDraft] = useState('')
  const [tags, setTags] = useState('')
  const [sort, setSort] = useState<SortOrder>('desc')

  // The route 400s on an empty tags param, so an empty query stays local.
  const results = useAsync(
    (signal) =>
      tags ? api.search.searchPhotos(tags.split(','), sort, signal) : Promise.resolve({ results: [] }),
    [tags, sort],
  )

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTags(
      draft
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .join(','),
    )
  }

  const list = results.data?.results ?? []

  return (
    <>
      <Header />

      <main className="container">
        <h1>Search by tag</h1>

        <form className="form form--inline" onSubmit={handleSubmit}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="sunset, beach"
            aria-label="Tags, comma separated"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOrder)}
            aria-label="Sort order"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
          <button type="submit" className="btn--primary">
            Search
          </button>
        </form>

        <p className="muted">
          Searches Pixabay tags and your own tags, across every board you can see.
        </p>

        {results.loading && tags && <SkeletonGrid count={6} />}
        {results.error && <ErrorMessage message={results.error} onRetry={results.reload} />}

        {!tags && !results.loading && (
          <EmptyState title="Enter a tag to search">
            <p>Try something like “sunset” or “forest, path”.</p>
          </EmptyState>
        )}

        {tags && !results.loading && !results.error && list.length === 0 && (
          <EmptyState title={`No photos tagged “${tags}”`}>
            <p>Only photos on boards you can view are searchable.</p>
          </EmptyState>
        )}

        {list.length > 0 && (
          <div className="grid">
            {list.map((photo) => (
              <figure key={photo.id} className="card">
                <img src={photo.thumbnailUrl} alt={photo.tags.join(', ')} loading="lazy" />
                <figcaption className="card__body">
                  <p className="card__tags">{photo.tags.join(', ')}</p>
                  <div className="stack">
                    {/* One tile per image, even when it sits on several boards. */}
                    {photo.boards.map((board) => (
                      <div key={board.id}>
                        <Link to={`/boards/${board.id}/photos/${photo.id}`}>{board.name}</Link>
                        {board.userTags.length > 0 && (
                          <span className="muted"> · {board.userTags.join(', ')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
