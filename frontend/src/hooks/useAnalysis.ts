import { useCallback } from 'react'
import { analysesApi } from '../api/analyses'
import { useAnalysisStore } from '../stores/analysisStore'
import { usePolling } from './usePolling'
import type { Analysis } from '../types'

export function useAnalysis(id: string) {
  const { updateAnalysisInList } = useAnalysisStore()

  const fetchFn = useCallback(async () => {
    const analysis = await analysesApi.get(id)
    updateAnalysisInList(analysis)
    return analysis
  }, [id, updateAnalysisInList])

  const shouldStop = useCallback((analysis: Analysis) => {
    return analysis.status === 'COMPLETED' || analysis.status === 'FAILED'
  }, [])

  const { data, isPolling, error, refetch } = usePolling<Analysis>(
    fetchFn,
    shouldStop,
    3000
  )

  return { analysis: data, isPolling, error, refetch }
}
