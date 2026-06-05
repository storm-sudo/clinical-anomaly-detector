import client from './client'
import type { Analysis, AnalysisConfig, PaginatedResponse, DashboardStats } from '../types'

export const analysesApi = {
  list: async (params?: {
    page?: number
    size?: number
    dataset_id?: string
    status?: string
  }): Promise<Analysis[]> => {
    const response = await client.get<Analysis[]>('/api/analyses', { params })
    return response.data
  },

  get: async (id: string): Promise<Analysis> => {
    const response = await client.get<Analysis>(`/api/analyses/${id}`)
    return response.data
  },

  getStatus: async (id: string): Promise<{ status: string; progress?: number; message?: string }> => {
    const response = await client.get<{ status: string; progress?: number; message?: string }>(
      `/api/analyses/${id}/status`
    )
    return response.data
  },

  create: async (config: AnalysisConfig): Promise<Analysis> => {
    const response = await client.post<Analysis>('/api/analyses', config)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/api/analyses/${id}`)
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await client.get<DashboardStats>('/api/analyses/dashboard/stats')
    return response.data
  },

  generateReport: async (id: string): Promise<{ message: string; report_url: string; report_s3_key: string }> => {
    const response = await client.post<{ message: string; report_url: string; report_s3_key: string }>(
      `/api/analyses/${id}/report/generate`
    )
    return response.data
  },

  downloadReport: async (id: string): Promise<Blob> => {
    const response = await client.get(`/api/analyses/${id}/report/download`, {
      responseType: 'blob',
    })
    return response.data
  },
}

