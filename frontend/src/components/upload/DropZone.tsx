import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { formatFileSize } from '../../utils/formatters'

interface DropZoneProps {
  onFileAccepted: (file: File) => void
  isUploading?: boolean
  uploadProgress?: number
  accept?: Record<string, string[]>
  maxSize?: number
  className?: string
}

export function DropZone({
  onFileAccepted,
  isUploading = false,
  uploadProgress = 0,
  accept = {
    'text/csv': ['.csv'],
    'text/tab-separated-values': ['.tsv'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
  },
  maxSize = 50 * 1024 * 1024, // 50MB
  className = '',
}: DropZoneProps) {
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadDone, setUploadDone] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null)
      if (rejectedFiles.length > 0) {
        const msg = rejectedFiles[0]?.errors[0]?.message ?? 'Invalid file'
        setError(msg)
        return
      }
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        setDroppedFile(file)
        setUploadDone(false)
        onFileAccepted(file)
      }
    },
    [onFileAccepted]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  })

  const getState = () => {
    if (error) return 'error'
    if (isUploading) return 'uploading'
    if (uploadDone) return 'success'
    if (isDragActive) return 'dragging'
    if (droppedFile) return 'selected'
    return 'idle'
  }

  const state = getState()

  const borderColor = {
    idle: '#E6E1DA',
    dragging: '#111111',
    uploading: '#111111',
    success: '#10b981',
    error: '#ef4444',
    selected: '#9C9284',
  }[state]

  const bgColor = {
    idle: '#ffffff',
    dragging: '#FAF7F2',
    uploading: '#ffffff',
    success: '#ecfdf5',
    error: '#fef2f2',
    selected: '#FAF7F2',
  }[state]

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200"
        style={{
          borderColor,
          background: bgColor,
          boxShadow:
            isDragActive
              ? '0 10px 15px -3px rgba(0,0,0,0.05)'
              : 'none',
        }}
      >
        <input {...getInputProps()} />

        {state === 'idle' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4 text-gray-700">
              <Upload size={24} />
            </div>
            <p className="text-gray-900 font-medium mb-1">Drop your data file here</p>
            <p className="text-gray-500 text-sm mb-3">or click to browse</p>
            <p className="text-gray-400 text-xs">
              Accepts .csv, .tsv, .xlsx, .xls — max 50 MB
            </p>
          </>
        )}

        {state === 'dragging' && (
          <>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gray-900 text-white"
            >
              <Upload size={24} />
            </div>
            <p className="text-gray-900 font-semibold text-lg">Release to upload</p>
          </>
        )}

        {state === 'selected' && droppedFile && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4 text-gray-700">
              <FileText size={24} />
            </div>
            <p className="text-gray-900 font-semibold mb-1">{droppedFile.name}</p>
            <p className="text-gray-500 text-sm">{formatFileSize(droppedFile.size)}</p>
          </>
        )}

        {state === 'uploading' && droppedFile && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4 text-gray-900">
              <Loader2 size={24} className="animate-spin" />
            </div>
            <p className="text-gray-900 font-medium mb-3">Uploading {droppedFile.name}…</p>
            <div className="w-full max-w-xs mx-auto">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-gray-900"
                  style={{
                    width: `${uploadProgress}%`,
                  }}
                />
              </div>
            </div>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <CheckCircle size={24} />
            </div>
            <p className="text-emerald-700 font-semibold mb-1">Upload complete!</p>
            <p className="text-gray-500 text-sm">{droppedFile?.name}</p>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center mx-auto mb-4 text-red-600">
              <XCircle size={24} />
            </div>
            <p className="text-red-700 font-semibold mb-1">Upload failed</p>
            <p className="text-gray-500 text-sm">{error}</p>
            <p className="text-slate-500 text-xs mt-2">Click to try again</p>
          </>
        )}
      </div>
    </div>
  )
}
