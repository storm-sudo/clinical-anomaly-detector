import { useState, useEffect, useRef, useCallback } from 'react'

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  shouldStop: (data: T) => boolean,
  intervalMs: number = 3000
): { data: T | null; isPolling: boolean; error: Error | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const doFetch = useCallback(async () => {
    try {
      const result = await fetchFn()
      if (!mountedRef.current) return
      setData(result)
      setError(null)
      if (shouldStop(result)) {
        setIsPolling(false)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err : new Error('Polling error'))
    }
  }, [fetchFn, shouldStop])

  const refetch = useCallback(() => {
    doFetch()
  }, [doFetch])

  useEffect(() => {
    mountedRef.current = true
    doFetch()
    intervalRef.current = setInterval(doFetch, intervalMs)

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [doFetch, intervalMs])

  return { data, isPolling, error, refetch }
}
