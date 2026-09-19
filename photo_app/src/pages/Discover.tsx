import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { api } from '../api'
import type { DiscoverPhoto } from '../api'
import EmptyState from '../components/EmptyState'
import ErrorMessage from '../components/ErrorMessage'
import Header from '../components/Header'
import PhotoCard from '../components/PhotoCard'
import SkeletonGrid from '../components/SkeletonGrid'
import Spinner from '../components/Spinner'
import { useAsync } from '../hooks/useAsync'

export default function Discover() {
  // `draft` is what's typed; `query` is what's been submitted. Keeping them
  // separate stops a request firing on every keystroke.
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  // The feed accumulates across pages rather than replacing them, so useAsync —
  // which is built to discard the previous result — isn't the right tool here.
  const [photos, setPhotos] = useState<DiscoverPhoto[]>([])
  const [exhausted, setExhausted] = useState(false)
  // Bumped to re-run the fetch effect after a failure, since retrying the same
  // page is not a state change the effect would otherwise notice.
  const [attempt, setAttempt] = useState(0)

  // Loading and error belong to one specific request, so they're keyed to it
  // and reset during render rather than inside the effect: React 19 rejects a
  // synchronous setState in an effect body, and this also avoids painting a
  // frame of the previous request's state.
  const requestKey = `${query}|${page}|${attempt}`
  const [status, setStatus] = useState({ key: requestKey, loading: true, error: null as string | null })
  if (status.key !== requestKey) {
    setStatus({ key: requestKey, loading: true, error: null })
  }
  const { loading, error } = status

  const boards = useAsync(() => api.boards.myBoards(), [])

  useEffect(() => {
    const controller = new AbortController()

    api.search
      .discoverPhotos({ q: query || undefined, page }, controller.signal)
      .then(({ photos: incoming }) => {
        if (controller.signal.aborted) return
        // Pixabay can repeat an image across pages, and StrictMode runs this
        // effect twice in dev — de-duping on pixabayId covers both.
        setPhotos((current) => {
          const seen = new Set(current.map((p) => p.pixabayId))
          return [...current, ...incoming.filter((p) => !seen.has(p.pixabayId))]
        })
        if (incoming.length === 0) setExhausted(true)
        setStatus((current) =>
          current.key === requestKey ? { ...current, loading: false } : current,
        )
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : 'Could not load the feed'
        setStatus((current) =>
          current.key === requestKey ? { ...current, loading: false, error: message } : current,
        )
      })

    return () => controller.abort()
  }, [query, page, attempt, requestKey])

  // Asking for the next page when a sentinel below the grid comes into view.
  // rootMargin fires it early, so the next batch is usually already there by
  // the time the user reaches the bottom.
  const sentinel = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const target = sentinel.current
    if (!target || exhausted || loading || error) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setPage((p) => p + 1)
      },
      { rootMargin: '600px' },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [exhausted, loading, error])
  // Only boards we can write to are save targets; `saved` boards belong to
  // other people.
  const targets = [...(boards.data?.owned ?? []), ...(boards.data?.collaborating ?? [])]

  // A new search is a new feed, so the accumulated pages go with it.
  const restart = (next: string) => {
    setQuery(next)
    setPhotos([])
    setPage(1)
    setExhausted(false)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    restart(draft.trim())
  }

  const handleSave = useCallback(async (photo: DiscoverPhoto, boardId: string) => {
    await api.boardPhotos.add(boardId, photo)
    // The server already filters saved photos out of Discover, so dropping the
    // tile here keeps this page consistent with what a reload would show.
    setPhotos((current) => current.filter((p) => p.pixabayId !== photo.pixabayId))
  }, [])

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
                restart('')
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

        {photos.length > 0 && (
          <div className="grid">
            {photos.map((photo) => (
              <PhotoCard key={photo.pixabayId} photo={photo} boards={targets} onSave={handleSave} />
            ))}
          </div>
        )}

        {/* First page only: once there are tiles on screen, replacing them with
            skeletons would throw away the user's scroll position. */}
        {loading && photos.length === 0 && <SkeletonGrid />}
        {loading && photos.length > 0 && <Spinner label="Loading more…" />}

        {error && (
          <ErrorMessage message={error} onRetry={() => setAttempt((a) => a + 1)} />
        )}

        {!loading && !error && photos.length === 0 && (
          <EmptyState title={query ? `No photos for “${query}”` : 'No photos to show'}>
            <p>Try another search.</p>
          </EmptyState>
        )}

        {exhausted && photos.length > 0 && (
          <p className="muted" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            That's everything.
          </p>
        )}

        {/* Watched by the observer above; crossing it loads the next page. */}
        <div ref={sentinel} aria-hidden="true" />
      </main>
    </>
  )
}
