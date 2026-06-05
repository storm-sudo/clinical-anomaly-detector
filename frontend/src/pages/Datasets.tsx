import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import anime from 'animejs'
import {
  Plus,
  Search,
  Database,
  Trash2,
  Activity,
  FileText,
  BarChart2,
  X,
} from 'lucide-react'
import { useDatasetStore } from '../stores/datasetStore'
import { EmptyState } from '../components/shared/EmptyState'
import { DropZone } from '../components/upload/DropZone'
import LoadingSkeleton from '../components/shared/LoadingSkeleton'
import { formatFileSize, formatRelativeTime } from '../utils/formatters'

export default function Datasets() {
  const navigate = useNavigate()
  const { datasets, isLoading, isUploading, uploadProgress, fetchDatasets, uploadDataset, deleteDataset } =
    useDatasetStore()
  const [search, setSearch] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchDatasets()
  }, [fetchDatasets])

  useEffect(() => {
    if (!isLoading && cardsRef.current) {
      anime({
        targets: cardsRef.current.querySelectorAll('.dataset-card'),
        opacity: [0, 1],
        translateY: [16, 0],
        delay: anime.stagger(80),
        duration: 500,
        easing: 'easeOutCubic',
      })
    }
  }, [isLoading, datasets])

  const filtered = datasets.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.original_filename.toLowerCase().includes(search.toLowerCase())
  )

  const handleUpload = async (file: File) => {
    const dataset = await uploadDataset(file)
    if (dataset) {
      setShowUploadModal(false)
      navigate(`/datasets/${dataset.id}`)
    }
  }

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete dataset "${name}"? This action cannot be undone.`)) return
    await deleteDataset(id)
  }

  const getMissingPercent = (dataset: typeof datasets[0]) => {
    if (!dataset.missing_value_summary) return 0
    const vals = Object.values(dataset.missing_value_summary)
    if (!vals.length || !dataset.row_count) return 0
    const totalMissing = vals.reduce((a, b) => a + b, 0)
    const totalCells = dataset.row_count * dataset.column_count
    return (totalMissing / totalCells) * 100
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Datasets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{datasets.length} dataset{datasets.length !== 1 ? 's' : ''} uploaded</p>
        </div>
        <button onClick={() => setShowUploadModal(true)} className="btn-primary">
          <Plus size={15} />
          Upload Dataset
        </button>
      </div>

      {/* Search */}
      <div className="relative w-72">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search datasets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9 border-gray-200"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <LoadingSkeleton key={i} variant="card" rows={3} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Database}
          title={search ? 'No datasets match your search' : 'No datasets yet'}
          subtitle={
            search
              ? 'Try a different search term'
              : 'Upload your first clinical dataset to get started with anomaly detection'
          }
          action={!search ? { label: 'Upload Dataset', onClick: () => setShowUploadModal(true), icon: Plus } : undefined}
        />
      ) : (
        <div ref={cardsRef} className="grid grid-cols-3 gap-4">
          {filtered.map((dataset) => {
            const missingPct = getMissingPercent(dataset)
            return (
              <Link
                key={dataset.id}
                to={`/datasets/${dataset.id}`}
                className="dataset-card glass-card glass-card-hover p-5 block opacity-0 bg-white border border-gray-100"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-sky-50 border border-sky-100 text-sky-600"
                  >
                    <Database size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-sm">{dataset.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{dataset.original_filename}</p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(dataset.id, dataset.name, e)}
                    className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Rows', value: dataset.row_count.toLocaleString(), icon: BarChart2 },
                    { label: 'Cols', value: dataset.column_count, icon: FileText },
                    { label: 'Size', value: formatFileSize(dataset.file_size_bytes), icon: Database },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="text-center p-2 rounded-lg bg-gray-50 border border-gray-100/50"
                    >
                      <div className="text-sm font-bold text-gray-900">{value}</div>
                      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Missing data bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Missing data</span>
                    <span className={missingPct > 20 ? 'text-amber-600 font-bold' : 'text-gray-500 font-medium'}>
                      {missingPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${missingPct > 20 ? 'bg-amber-500' : 'bg-sky-500'}`}
                      style={{
                        width: `${Math.min(missingPct, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{formatRelativeTime(dataset.created_at)}</span>
                  {dataset.analyses_count !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Activity size={11} className="text-gray-400" />
                      {dataset.analyses_count} {dataset.analyses_count === 1 ? 'analysis' : 'analyses'}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Link
                    to={`/analyses/new?datasetId=${dataset.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-center text-xs py-1.5 rounded-lg font-semibold transition-all bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100"
                  >
                    Run Analysis
                  </Link>
                  <Link
                    to={`/datasets/${dataset.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-center text-xs py-1.5 rounded-lg font-semibold transition-all btn-secondary"
                  >
                    View
                  </Link>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="relative w-full max-w-md glass-card p-6 bg-white border border-gray-200 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Upload Dataset</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <DropZone
              onFileAccepted={handleUpload}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
            />
          </div>
        </div>
      )}
    </div>
  )
}
