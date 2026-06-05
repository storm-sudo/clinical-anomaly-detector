import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useDatasetStore } from '../stores/datasetStore'
import { formatFileSize } from '../utils/formatters'
import { 
  FileText, 
  Calendar, 
  Database, 
  Columns, 
  AlertCircle, 
  Play, 
  ArrowLeft,
  Activity,
  User,
  Info,
  Table as TableIcon
} from 'lucide-react'
import LoadingSkeleton from '../components/shared/LoadingSkeleton'

export default function DatasetDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentDataset, isLoading, fetchDataset } = useDatasetStore()
  const [activeTab, setActiveTab] = useState<'preview' | 'schema' | 'missing'>('preview')

  useEffect(() => {
    if (id) {
      fetchDataset(id)
    }
  }, [id, fetchDataset])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!currentDataset) {
    return (
      <div className="flex flex-col items-center justify-center h-64 glass-card p-8 text-center bg-white border border-gray-150 shadow-lg">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-gray-900">Dataset Not Found</h3>
        <p className="text-gray-500 mt-2">The dataset you are looking for does not exist or has been deleted.</p>
        <Link to="/datasets" className="mt-4 btn-primary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Datasets
        </Link>
      </div>
    )
  }

  // Formatting helpers
  const columns = currentDataset.columns || []
  const columnTypes = currentDataset.column_types || {}
  const missingSummary = currentDataset.missing_value_summary || {}
  const previewRows = currentDataset.preview_data || []
  const totalRows = currentDataset.row_count || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/datasets')} className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-sm mb-2 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Datasets
          </button>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-gray-900" />
            {currentDataset.name}
          </h1>
          <p className="text-gray-500 mt-1">
            Original file: <code className="text-xs bg-gray-100 border border-gray-250 px-2 py-0.5 rounded-md text-gray-900 font-mono">{currentDataset.original_filename}</code>
          </p>
        </div>

        <button 
          onClick={() => navigate(`/analyses/new?dataset_id=${currentDataset.id}`)}
          className="btn-primary px-5 py-3 shadow-lg flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" /> Run Anomaly Detection
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center gap-4 bg-white border border-gray-100 shadow-md">
          <div className="p-3 bg-sky-100 rounded-lg text-sky-600">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Row Count</p>
            <p className="text-xl font-bold text-gray-900">{totalRows.toLocaleString()}</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4 bg-white border border-gray-100 shadow-md">
          <div className="p-3 bg-violet-100 rounded-lg text-violet-600">
            <Columns className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Columns</p>
            <p className="text-xl font-bold text-gray-900">{columns.length}</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4 bg-white border border-gray-100 shadow-md">
          <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">File Size</p>
            <p className="text-xl font-bold text-gray-900">{formatFileSize(currentDataset.file_size_bytes || 0)}</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4 bg-white border border-gray-100 shadow-md">
          <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Uploaded On</p>
            <p className="text-base font-bold text-gray-900">
              {new Date(currentDataset.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Clinical Metadata & Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Clinical trial details */}
        <div className="glass-card p-5 space-y-4 h-fit bg-white border border-gray-100 shadow-md">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
            <Info className="w-4 h-4 text-gray-900" /> Clinical Context
          </h3>
          
          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Trial Protocol</span>
              <span className="text-sm font-semibold text-gray-900">{currentDataset.trial_name || 'Not specified'}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Trial Phase</span>
                <span className="text-sm font-semibold text-gray-900">{currentDataset.trial_phase || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Trial Data Type</span>
                <span className="text-sm font-semibold text-gray-900 capitalize">{currentDataset.data_type || 'Auto'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Subject ID Column</span>
                <span className="text-[10px] font-mono font-bold bg-gray-50 border border-gray-250 text-gray-900 px-2 py-0.5 rounded-md mt-1 inline-block">
                  {currentDataset.subject_id_column || 'Auto-detected'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Timepoint Column</span>
                <span className="text-[10px] font-mono font-bold bg-gray-50 border border-gray-250 text-gray-900 px-2 py-0.5 rounded-md mt-1 inline-block">
                  {currentDataset.timepoint_column || 'Auto-detected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Schema/Preview Tabs */}
        <div className="lg:col-span-2 glass-card flex flex-col h-[500px] bg-white border border-gray-100 shadow-md">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50 rounded-t-xl px-4 pt-3 gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-all flex items-center gap-2 ${
                activeTab === 'preview'
                  ? 'bg-white border-t border-x border-gray-200 text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 font-medium'
              }`}
            >
              <TableIcon className="w-4 h-4" /> Data Preview
            </button>
            <button
              onClick={() => setActiveTab('schema')}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-all flex items-center gap-2 ${
                activeTab === 'schema'
                  ? 'bg-white border-t border-x border-gray-200 text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 font-medium'
              }`}
            >
              <Columns className="w-4 h-4" /> Columns & Types
            </button>
            <button
              onClick={() => setActiveTab('missing')}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-all flex items-center gap-2 ${
                activeTab === 'missing'
                  ? 'bg-white border-t border-x border-gray-200 text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 font-medium'
              }`}
            >
              <AlertCircle className="w-4 h-4" /> Missing Data ({Object.keys(missingSummary).length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'preview' && (
              <div className="overflow-x-auto h-full border border-gray-200 rounded-lg">
                {previewRows.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase sticky top-0 border-b border-gray-200">
                      <tr>
                        <th className="p-3 w-12 text-center text-gray-400">#</th>
                        {columns.map((col) => (
                          <th key={col} className="p-3 min-w-[120px]">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-900">
                      {previewRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-3 text-center text-gray-400 border-r border-gray-100">{rIdx + 1}</td>
                          {columns.map((col) => {
                            const val = row[col];
                            return (
                              <td key={col} className="p-3 font-mono text-gray-700">
                                {val === null || val === undefined ? (
                                  <span className="text-gray-400 italic">NULL</span>
                                ) : (
                                  String(val)
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 font-medium">
                    No preview data available.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'schema' && (
              <div className="space-y-2 max-h-full overflow-y-auto">
                <div className="grid grid-cols-3 text-[10px] font-bold text-gray-500 border-b border-gray-200 pb-2 px-4 uppercase tracking-wider">
                  <div>Column Name</div>
                  <div>Inferred Type</div>
                  <div>Missing Values</div>
                </div>
                <div className="divide-y divide-gray-100">
                  {columns.map((col) => {
                    const type = columnTypes[col] || 'unknown';
                    const missing = missingSummary[col] || 0;
                    const missingPct = totalRows > 0 ? (missing / totalRows) * 100 : 0;
                    
                    return (
                      <div key={col} className="grid grid-cols-3 text-sm py-3 px-4 hover:bg-gray-50/50 rounded transition-colors items-center">
                        <div className="font-semibold text-gray-900 font-mono">{col}</div>
                        <div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                            type === 'numeric' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                            type === 'categorical' ? 'bg-violet-50 text-violet-700 border-violet-100' :
                            'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {type}
                          </span>
                        </div>
                        <div className="text-gray-600 text-xs font-mono">
                          {missing > 0 ? (
                            <span className="text-amber-600 font-semibold">
                              {missing.toLocaleString()} ({missingPct.toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">0%</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'missing' && (
              <div className="space-y-4 max-h-full overflow-y-auto">
                {Object.keys(missingSummary).length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500">
                      These columns contain missing entries. High missing rates (&gt;5%) can bias analysis results.
                    </p>
                    <div className="space-y-3">
                      {Object.entries(missingSummary).map(([col, count]) => {
                        const cnt = Number(count);
                        const pct = totalRows > 0 ? (cnt / totalRows) * 100 : 0;
                        const isSevere = pct > 20;
                        const isHigh = pct > 5;
                        
                        return (
                          <div key={col} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="font-mono text-gray-900">{col}</span>
                              <span className={isSevere ? 'text-red-600 font-bold' : isHigh ? 'text-amber-600 font-bold' : 'text-gray-500 font-medium'}>
                                {cnt.toLocaleString()} missing ({pct.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${isSevere ? 'bg-red-500' : isHigh ? 'bg-amber-500' : 'bg-sky-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
                    <AlertCircle className="w-8 h-8 text-emerald-600 mb-2" />
                    <p className="font-semibold text-gray-900">Perfect Completeness!</p>
                    <p className="text-xs text-gray-500 mt-1">This dataset contains zero missing values.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
