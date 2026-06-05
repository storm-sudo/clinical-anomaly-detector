import { useCallback, useEffect } from 'react'
import { useDatasetStore } from '../stores/datasetStore'

export function useDataset(id?: string) {
  const {
    datasets,
    currentDataset,
    isLoading,
    isUploading,
    uploadProgress,
    total,
    fetchDatasets,
    fetchDataset,
    uploadDataset,
    deleteDataset,
    setCurrentDataset,
  } = useDatasetStore()

  useEffect(() => {
    if (id) {
      fetchDataset(id)
    }
  }, [id, fetchDataset])

  const handleUpload = useCallback(
    async (
      file: File,
      metadata?: {
        trial_name?: string
        trial_phase?: string
        data_type?: string
        timepoint_column?: string
        subject_id_column?: string
      }
    ) => {
      return uploadDataset(file, metadata)
    },
    [uploadDataset]
  )

  const handleDelete = useCallback(
    async (datasetId: string) => {
      return deleteDataset(datasetId)
    },
    [deleteDataset]
  )

  return {
    datasets,
    currentDataset,
    isLoading,
    isUploading,
    uploadProgress,
    total,
    fetchDatasets,
    fetchDataset,
    uploadDataset: handleUpload,
    deleteDataset: handleDelete,
    setCurrentDataset,
  }
}
