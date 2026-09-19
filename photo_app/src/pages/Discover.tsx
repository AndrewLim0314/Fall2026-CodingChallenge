import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { api } from '../api'
import type { DiscoverPhoto } from '../api'
import EmptyState from '../components/EmptyState'
import ErrorMessage from '../components/ErrorMessage'
import Header from '../components/Header'
import PhotoCard from '../components/PhotoCard'
import SkeletonGrid from '../components/SkeletonGrid'
import { useAsync } from '../hooks/useAsync'

export default function Discover() {
  // `draft` is what's typed; `query` is what's been submitted. Keeping them
  // separate stops a request firing on every keystroke.
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const feed = useAsync(
    (signal) => api.search.discoverPhotos({ q: query || undefined, page }, signal),
    [query, page],
  )
  const boards = useAsync(() => api.boards.myBoards(), [])

  const photos = feed.data?.photos ?? []
  // Only boards we can write to are save targets; `saved` boards belong to
  // other people.
  const targets = [...(boards.data?.owned ?? []), ...(boards.data?.collaborating ?? [])]

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setQuery(draft.trim())
  }

  const handleSave = useCallback(
    async (photo: DiscoverPhoto, boardId: string) => {
      await api.boardPhotos.add(boardId, photo)
      // The server already filters saved photos out of Discover, so dropping
      // the tile here keeps this page consistent with what a reload would show.
      feed.setData((current) =>
        current
          ? { photos: current.photos.filter((p) => p.pixabayId !== photo.pixabayId) }
          : current,
      )
    },
    [feed],
  )

  return (
    <>
      <Header />

      <main className="container">
        <h1>Feed</h1>

        <form className="form form--inline" onSubmit={handleSubmit}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search Pixabay (e.g. sunset)"
            aria-label="Search Pixabay"
          />
          <button type="submit" className="btn--primary">
            Search
          </button>
          {query && (
            <button
              type="button"
              onClick={() => {
                setDraft('')
                setQuery('')
                setPage(1)
              }}
            >
              Clear
            </button>
          )}
        </form>

        {targets.length === 0 && !boards.loading && (
          <EmptyState title="You have no boards yet">
            <p>
              <Link to="/boards">Create one</Link> to start saving photos.
            </p>
          </EmptyState>
        )}

        {feed.loading && <SkeletonGrid />}
        {feed.error && <ErrorMessage message={feed.error} onRetry={feed.reload} />}

        {!feed.loading && !feed.error && photos.length === 0 && (
          <EmptyState title={query ? `No photos for “${query}”` : 'No photos to show'}>
            <p>Try another search.</p>
          </EmptyState>
        )}

        {photos.length > 0 && (
          <div className="grid">
            {photos.map((photo) => (
              <PhotoCard key={photo.pixabayId} photo={photo} boards={targets} onSave={handleSave} />
            ))}
          </div>
        )}

        <div className="row" style={{ marginTop: '1rem' }}>
          <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            Previous
          </button>
          <span className="muted">Page {page}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={feed.loading || photos.length === 0}
          >
            Next
          </button>
        </div>
      </main>
    </>
  )
}
