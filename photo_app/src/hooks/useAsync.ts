import { useCallback, useEffect, useRef, useState } from 'react'

type State<T> = {
  key: string
  data: T | null
  loading: boolean
  error: string | null
}

type Updater<T> = T | null | ((current: T | null) => T | null)

/**
 * Runs an async function and tracks loading/error/data for it.
 *
 * The function receives an AbortSignal: when deps change or the component
 * unmounts, the in-flight request is cancelled so a slow earlier response can't
 * land after a newer one and overwrite it.
 *
 * `deps` are identified by their JSON form, so pass primitives.
 */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[] = []) {
  const [nonce, setNonce] = useState(0)
  const key = JSON.stringify([deps, nonce])

  const [state, setState] = useState<State<T>>({ key, data: null, loading: true, error: null })

  // Resetting to "loading" as the key changes, during render rather than in an
  // effect: an effect would paint one frame of the previous result first.
  if (state.key !== key) {
    setState({ key, data: null, loading: true, error: null })
  }

  // Kept current in an effect, not during render — writing a ref while
  // rendering is unsafe once React can discard a render.
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })

  useEffect(() => {
    const controller = new AbortController()

    fnRef.current(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setState((current) =>
          current.key === key ? { ...current, data: result, loading: false } : current,
        )
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : 'Something went wrong'
        setState((current) =>
          current.key === key ? { ...current, error: message, loading: false } : current,
        )
      })

    return () => controller.abort()
  }, [key])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  const setData = useCallback((update: Updater<T>) => {
    setState((current) => ({
      ...current,
      data:
        typeof update === 'function'
          ? (update as (value: T | null) => T | null)(current.data)
          : update,
    }))
  }, [])

  return { data: state.data, loading: state.loading, error: state.error, reload, setData }
}
