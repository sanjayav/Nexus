import { useState, useEffect, useCallback } from 'react'

/**
 * Generic hook to fetch data from API with automatic fallback to mock data.
 * Returns { data, loading, error, refetch }.
 * If API call fails (e.g. no backend running), falls back to mockData silently.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  mockData: T,
  deps: unknown[] = []
): { data: T; loading: boolean; error: string | null; refetch: () => void; isLive: boolean } {
  const [data, setData] = useState<T>(mockData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
      setIsLive(true)
    } catch (err) {
      // Silently fallback to mock data
      setData(mockData)
      setIsLive(false)
      setError(err instanceof Error ? err.message : 'API unavailable')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData, isLive }
}

/**
 * Mutation helper — POST/PUT/DELETE with optimistic feedback.
 */
export function useMutation<TInput, TOutput>(
  mutator: (input: TInput) => Promise<TOutput>
): {
  mutate: (input: TInput) => Promise<TOutput | null>
  loading: boolean
  error: string | null
} {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (input: TInput): Promise<TOutput | null> => {
    setLoading(true)
    setError(null)
    try {
      const result = await mutator(input)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}
