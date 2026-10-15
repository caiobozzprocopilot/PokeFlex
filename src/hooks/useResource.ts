import { useCallback, useEffect, useState } from 'react'

export type Resource<T> = { data: T | null; error: string | null; loading: boolean; retry: () => void }

type State<T> = { key: string | null; done: boolean; data: T | null; error: string | null }

// key identifica o recurso; quando ela muda, recarrega. key nula não carrega nada.
export function useResource<T>(key: string | null, load: () => Promise<T>): Resource<T> {
  const [state, setState] = useState<State<T>>({ key, done: false, data: null, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (key === null) return
    let cancelled = false
    setState((s) => (s.key === key && s.done && !s.error ? s : { key, done: false, data: null, error: null }))
    load().then(
      (data) => !cancelled && setState({ key, done: true, data, error: null }),
      (err: unknown) =>
        !cancelled &&
        setState({ key, done: true, data: null, error: err instanceof Error ? err.message : 'Não foi possível carregar.' }),
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const current = state.key === key
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: key !== null && !(current && state.done),
    retry,
  }
}
