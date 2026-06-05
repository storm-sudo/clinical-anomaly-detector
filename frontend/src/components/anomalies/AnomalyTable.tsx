import { useState, useEffect, useRef } from 'react'
import anime from 'animejs'
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import type { Anomaly, AnomalySeverity } from '../../types'
import { SeverityBadge } from './SeverityBadge'
import { anomaliesApi } from '../../api/anomalies'
import toast from 'react-hot-toast'

interface AnomalyTableProps {
  anomalies: Anomaly[]
  total?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onSeverityFilter?: (severity: string) => void
  onColumnFilter?: (column: string) => void
  onUpdate?: (anomaly: Anomaly) => void
  showFilters?: boolean
  isLoading?: boolean
}

const SEVERITIES: AnomalySeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export function AnomalyTable({
  anomalies,
  total = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  onSeverityFilter,
  onColumnFilter,
  onUpdate,
  showFilters = true,
  isLoading = false,
}: AnomalyTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [selectedSeverity, setSelectedSeverity] = useState<string>('')
  const [sortCol, setSortCol] = useState<string>('severity')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [reviewing, setReviewing] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tableRef.current) {
      anime({
        targets: tableRef.current.querySelectorAll('.anomaly-row'),
        opacity: [0, 1],
        translateX: [-10, 0],
        delay: anime.stagger(30, { start: 100 }),
        duration: 400,
        easing: 'easeOutQuad',
      })
    }
  }, [anomalies])

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const handleSeverityChange = (sev: string) => {
    setSelectedSeverity(sev)
    onSeverityFilter?.(sev)
  }

  const handleReview = async (anomaly: Anomaly, isFP?: boolean) => {
    setReviewing(anomaly.id)
    try {
      const updated = await anomaliesApi.review(anomaly.id, isFP)
      onUpdate?.(updated)
      toast.success(isFP ? 'Marked as false positive' : 'Marked as reviewed')
    } catch {
      toast.error('Failed to update anomaly')
    } finally {
      setReviewing(null)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ChevronDown size={12} className="opacity-30" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-blue-400" /> : <ChevronDown size={12} className="text-blue-400" />
  }

  return (
    <div ref={tableRef}>
      {/* Filters */}
      {showFilters && (
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="flex gap-1">
            <button
              onClick={() => handleSeverityChange('')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                selectedSeverity === ''
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                  : 'border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              All
            </button>
            {SEVERITIES.map((sev) => (
              <button
                key={sev}
                onClick={() => handleSeverityChange(sev)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  selectedSeverity === sev
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                    : 'border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-slate-400 uppercase tracking-wider">
                {[
                  { key: 'row_index', label: 'Row' },
                  { key: 'subject_id', label: 'Subject' },
                  { key: 'column_name', label: 'Column' },
                  { key: 'value', label: 'Value' },
                  { key: 'severity', label: 'Severity' },
                  { key: 'anomaly_score', label: 'Score' },
                  { key: 'detection_method', label: 'Method' },
                  { key: 'is_reviewed', label: 'Status' },
                  { key: 'actions', label: 'Actions' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left cursor-pointer hover:text-slate-200 transition-colors"
                    onClick={() => col.key !== 'actions' && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.key !== 'actions' && <SortIcon col={col.key} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading anomalies...
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && anomalies.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    No anomalies found with the current filters.
                  </td>
                </tr>
              )}
              {!isLoading &&
                anomalies.map((anomaly) => (
                  <>
                    <tr
                      key={anomaly.id}
                      className={`anomaly-row border-b border-white/5 hover:bg-white/2 transition-colors cursor-pointer ${
                        anomaly.is_false_positive ? 'opacity-50' : ''
                      }`}
                      onClick={() =>
                        setExpandedRow(expandedRow === anomaly.id ? null : anomaly.id)
                      }
                    >
                      <td className="px-4 py-3 font-mono text-slate-300">
                        #{anomaly.row_index}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                        {anomaly.subject_id || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-blue-300 font-medium">{anomaly.column_name}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-200">
                        {anomaly.value}
                        {anomaly.expected_range_min !== undefined && (
                          <span className="text-xs text-slate-500 ml-1">
                            ({anomaly.expected_range_min?.toFixed(1)}–{anomaly.expected_range_max?.toFixed(1)})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <SeverityBadge severity={anomaly.severity} animate />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden"
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(anomaly.anomaly_score * 100, 100)}%`,
                                background:
                                  anomaly.anomaly_score > 0.7
                                    ? '#ef4444'
                                    : anomaly.anomaly_score > 0.4
                                    ? '#f59e0b'
                                    : '#3b82f6',
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">
                            {(anomaly.anomaly_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: 'rgba(139,92,246,0.12)',
                            color: '#a78bfa',
                            border: '1px solid rgba(139,92,246,0.2)',
                          }}
                        >
                          {anomaly.detection_method}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {anomaly.is_false_positive ? (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <XCircle size={12} /> FP
                          </span>
                        ) : anomaly.is_reviewed ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle size={12} /> Reviewed
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Eye size={12} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {!anomaly.is_reviewed && (
                            <button
                              onClick={() => handleReview(anomaly)}
                              disabled={reviewing === anomaly.id}
                              className="text-xs px-2 py-1 rounded text-emerald-400 hover:bg-emerald-400/10 border border-emerald-400/20 transition-all"
                            >
                              {reviewing === anomaly.id ? (
                                <span className="flex items-center gap-1">
                                  <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                </span>
                              ) : (
                                <Eye size={12} />
                              )}
                            </button>
                          )}
                          {!anomaly.is_false_positive && (
                            <button
                              onClick={() => handleReview(anomaly, true)}
                              disabled={reviewing === anomaly.id}
                              className="text-xs px-2 py-1 rounded text-slate-400 hover:bg-white/5 border border-white/10 transition-all"
                            >
                              <EyeOff size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded row detail */}
                    {expandedRow === anomaly.id && (
                      <tr key={`${anomaly.id}-expanded`} className="bg-white/2">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-xs text-slate-500 uppercase mb-1">Anomaly Type</div>
                              <div className="text-slate-200">{anomaly.anomaly_type}</div>
                            </div>
                            {anomaly.z_score !== undefined && (
                              <div>
                                <div className="text-xs text-slate-500 uppercase mb-1">Z-Score</div>
                                <div className="text-slate-200 font-mono">{anomaly.z_score.toFixed(2)}</div>
                              </div>
                            )}
                            {anomaly.clinical_significance && (
                              <div>
                                <div className="text-xs text-slate-500 uppercase mb-1">Clinical Significance</div>
                                <div className="text-amber-300">{anomaly.clinical_significance}</div>
                              </div>
                            )}
                            {anomaly.suggested_action && (
                              <div className="col-span-3">
                                <div className="text-xs text-slate-500 uppercase mb-1">Suggested Action</div>
                                <div
                                  className="text-slate-200 p-3 rounded-lg text-sm"
                                  style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}
                                >
                                  {anomaly.suggested_action}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-slate-400">
              Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => onPageChange?.(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30 text-slate-400 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => onPageChange?.(p)}
                    className={`w-7 h-7 text-xs rounded transition-all ${
                      p === page
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => onPageChange?.(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30 text-slate-400 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
