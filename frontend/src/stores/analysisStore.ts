import { create } from 'zustand'
import type { Analysis, AnalysisConfig, DashboardStats } from '../types'
import { analysesApi } from '../api/analyses'
import toast from 'react-hot-toast'

interface AnalysisState {
  analyses: Analysis[]
  currentAnalysis: Analysis | null
  dashboardStats: DashboardStats | null
  isLoading: boolean
  isCreating: boolean
  total: number
  fetchAnalyses: (params?: { page?: number; size?: number; dataset_id?: string }) => Promise<void>
  fetchAnalysis: (id: string) => Promise<Analysis | null>
  createAnalysis: (config: AnalysisConfig) => Promise<Analysis | null>
  deleteAnalysis: (id: string) => Promise<boolean>
  fetchDashboardStats: () => Promise<void>
  setCurrentAnalysis: (analysis: Analysis | null) => void
  updateAnalysisInList: (analysis: Analysis) => void
}

export const useAnalysisStore = create<AnalysisState>()((set, get) => ({
  analyses: [],
  currentAnalysis: null,
  dashboardStats: null,
  isLoading: false,
  isCreating: false,
  total: 0,

  fetchAnalyses: async (params) => {
    set({ isLoading: true })
    try {
      const result = await analysesApi.list(params)
      set({ analyses: result, total: result.length, isLoading: false })
    } catch {
      set({ isLoading: false })
      toast.error('Failed to fetch analyses')
    }
  },

  fetchAnalysis: async (id: string) => {
    set({ isLoading: true })
    try {
      const analysis = await analysesApi.get(id)
      set({ currentAnalysis: analysis, isLoading: false })
      return analysis
    } catch {
      set({ isLoading: false })
      toast.error('Failed to fetch analysis')
      return null
    }
  },

  createAnalysis: async (config: AnalysisConfig) => {
    set({ isCreating: true })
    try {
      const analysis = await analysesApi.create(config)
      set((state) => ({
        analyses: [analysis, ...state.analyses],
        isCreating: false,
      }))
      toast.success('Analysis started')
      return analysis
    } catch (err: unknown) {
      set({ isCreating: false })
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to create analysis'
      toast.error(message)
      return null
    }
  },

  deleteAnalysis: async (id: string) => {
    try {
      await analysesApi.delete(id)
      set((state) => ({
        analyses: state.analyses.filter((a) => a.id !== id),
        total: state.total - 1,
      }))
      toast.success('Analysis deleted')
      return true
    } catch {
      toast.error('Failed to delete analysis')
      return false
    }
  },

  fetchDashboardStats: async () => {
    try {
      const stats = await analysesApi.getDashboardStats()
      set({ dashboardStats: stats })
    } catch {
      // silently fail dashboard stats
    }
  },

  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),

  updateAnalysisInList: (analysis: Analysis) => {
    set((state) => ({
      analyses: state.analyses.map((a) => (a.id === analysis.id ? analysis : a)),
      currentAnalysis: state.currentAnalysis?.id === analysis.id ? analysis : state.currentAnalysis,
    }))
  },
}))
