import client from './client'
import type { Dataset, PaginatedResponse } from '../types'

export const datasetsApi = {
  list: async (params?: { page?: number; size?: number; search?: string }): Promise<Dataset[]> => {
    const response = await client.get<Dataset[]>('/api/datasets', { params })
    return response.data
  },

  get: async (id: string): Promise<Dataset> => {
    const response = await client.get<Dataset>(`/api/datasets/${id}`)
    return response.data
  },

  upload: async (file: File, metadata?: {
    trial_name?: string
    trial_phase?: string
    data_type?: string
    timepoint_column?: string
    subject_id_column?: string
  }, onProgress?: (percent: number) => void): Promise<Dataset> => {
    const formData = new FormData()
    formData.append('file', file)
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined) formData.append(key, value)
      })
    }
    const response = await client.post<Dataset>('/api/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (evt.total && onProgress) {
          onProgress(Math.round((evt.loaded / evt.total) * 100))
        }
      },
    })
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/api/datasets/${id}`)
  },

  getPreview: async (id: string, rows?: number): Promise<Record<string, unknown>[]> => {
    const response = await client.get<Record<string, unknown>[]>(`/api/datasets/${id}/preview`, {
      params: { rows: rows ?? 10 },
    })
    return response.data
  },

  getStats: async (id: string): Promise<Record<string, unknown>> => {
    const response = await client.get<Record<string, unknown>>(`/api/datasets/${id}/stats`)
    return response.data
  },
}
