import client from './client'
import type { Anomaly, PaginatedResponse } from '../types'

export const anomaliesApi = {
  list: async (params?: {
    analysis_id?: string
    page?: number
    size?: number
    severity?: string
    column_name?: string
    detection_method?: string
    is_reviewed?: boolean
    is_false_positive?: boolean
    min_score?: number
  }): Promise<PaginatedResponse<Anomaly>> => {
    const response = await client.get<PaginatedResponse<Anomaly>>('/api/anomalies', { params })
    return response.data
  },

  get: async (id: string): Promise<Anomaly> => {
    const response = await client.get<Anomaly>(`/api/anomalies/${id}`)
    return response.data
  },

  review: async (id: string, isFalsePositive?: boolean): Promise<Anomaly> => {
    if (isFalsePositive !== undefined) {
      const response = await client.patch<Anomaly>(`/api/anomalies/${id}/false-positive`, {
        is_false_positive: isFalsePositive,
      })
      return response.data
    } else {
      const response = await client.patch<Anomaly>(`/api/anomalies/${id}/review`, {
        review_note: 'Reviewed',
      })
      return response.data
    }
  },

  bulkReview: async (ids: string[], isFalsePositive?: boolean): Promise<void> => {
    await client.post('/api/anomalies/bulk-review', {
      anomaly_ids: ids,
      is_false_positive: isFalsePositive,
    })
  },

  getForAnalysis: async (
    analysisId: string,
    params?: {
      page?: number
      size?: number
      severity?: string
      column_name?: string
    }
  ): Promise<PaginatedResponse<Anomaly>> => {
    const response = await client.get<PaginatedResponse<Anomaly>>(
      `/api/analyses/${analysisId}/anomalies`,
      { params }
    )
    return response.data
  },

  exportCsv: async (analysisId: string): Promise<Blob> => {
    const response = await client.get(`/api/analyses/${analysisId}/anomalies/export`, {
      responseType: 'blob',
    })
    return response.data
  },
}
