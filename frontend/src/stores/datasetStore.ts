import { create } from 'zustand'
import type { Dataset } from '../types'
import { datasetsApi } from '../api/datasets'
import toast from 'react-hot-toast'

interface DatasetState {
  datasets: Dataset[]
  currentDataset: Dataset | null
  isLoading: boolean
  isUploading: boolean
  uploadProgress: number
  total: number
  page: number
  fetchDatasets: (params?: { page?: number; size?: number; search?: string }) => Promise<void>
  fetchDataset: (id: string) => Promise<Dataset | null>
  uploadDataset: (
    file: File,
    metadata?: {
      trial_name?: string
      trial_phase?: string
      data_type?: string
      timepoint_column?: string
      subject_id_column?: string
    }
  ) => Promise<Dataset | null>
  deleteDataset: (id: string) => Promise<boolean>
  setCurrentDataset: (dataset: Dataset | null) => void
}

export const useDatasetStore = create<DatasetState>()((set, get) => ({
  datasets: [],
  currentDataset: null,
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  total: 0,
  page: 1,

  fetchDatasets: async (params) => {
    set({ isLoading: true })
    try {
      const result = await datasetsApi.list(params)
      set({
        datasets: result,
        total: result.length,
        page: 1,
        isLoading: false,
      })
    } catch {
      set({ isLoading: false })
      toast.error('Failed to fetch datasets')
    }
  },

  fetchDataset: async (id: string) => {
    set({ isLoading: true })
    try {
      const dataset = await datasetsApi.get(id)
      set({ currentDataset: dataset, isLoading: false })
      return dataset
    } catch {
      set({ isLoading: false })
      toast.error('Failed to fetch dataset')
      return null
    }
  },

  uploadDataset: async (file, metadata) => {
    set({ isUploading: true, uploadProgress: 0 })
    try {
      const dataset = await datasetsApi.upload(file, metadata, (progress) => {
        set({ uploadProgress: progress })
      })
      set((state) => ({
        datasets: [dataset, ...state.datasets],
        isUploading: false,
        uploadProgress: 100,
      }))
      toast.success(`Dataset "${dataset.name}" uploaded successfully`)
      return dataset
    } catch (err: unknown) {
      set({ isUploading: false, uploadProgress: 0 })
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Upload failed'
      toast.error(message)
      return null
    }
  },

  deleteDataset: async (id: string) => {
    try {
      await datasetsApi.delete(id)
      set((state) => ({
        datasets: state.datasets.filter((d) => d.id !== id),
        total: state.total - 1,
      }))
      toast.success('Dataset deleted')
      return true
    } catch {
      toast.error('Failed to delete dataset')
      return false
    }
  },

  setCurrentDataset: (dataset) => set({ currentDataset: dataset }),
}))
