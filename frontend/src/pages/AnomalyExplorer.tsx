import React, { useEffect, useState } from 'react'
import { useAnalysisStore } from '../stores/analysisStore'
import { anomaliesApi } from '../api/anomalies'
import { AnomalyTable } from '../components/anomalies/AnomalyTable'
import { AlertTriangle, Filter, ClipboardList, ArrowRight } from 'lucide-react'
import type { Anomaly } from '../types'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function AnomalyExplorer() {
  const { analyses, fetchAnalyses, isLoading: isAnalysesLoading } = useAnalysisStore()
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>('')
  
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [severity, setSeverity] = useState<string>('')
  const [isLoadingAnoms, setIsLoadingAnoms] = useState(false)

  // Fetch all analyses on load
  useEffect(() => {
    fetchAnalyses({ size: 100 })
  }, [fetchAnalyses])

  // Get completed analyses
  const completedAnalyses = analyses.filter(a => a.status === 'COMPLETED')

  // Set default selected analysis
  useEffect(() => {
    if (completedAnalyses.length > 0 && !selectedAnalysisId) {
      setSelectedAnalysisId(completedAnalyses[0].id)
    }
  }, [completedAnalyses, selectedAnalysisId])

  // Fetch anomalies when selected analysis, page, or severity filter changes
  useEffect(() => {
    const fetchAnomalies = async () => {
      if (!selectedAnalysisId) {
        setAnomalies([])
        setTotal(0)
        return
      }
      setIsLoadingAnoms(true)
      try {
        const res = await anomaliesApi.getForAnalysis(selectedAnalysisId, {
          page,
          size: 10,
          severity: severity || undefined
        })
        setAnomalies(res.items)
        setTotal(res.total)
      } catch {
        toast.error('Failed to load anomalies')
      } finally {
        setIsLoadingAnoms(false)
      }
    };
    fetchAnomalies()
  }, [selectedAnalysisId, page, severity])

  const handleUpdateAnomaly = (updatedAnom: Anomaly) => {
    setAnomalies(anomalies.map(a => a.id === updatedAnom.id ? updatedAnom : a))
  };

  const handleExportCSV = async () => {
    if (!selectedAnalysisId) return
    try {
      const blob = await anomaliesApi.exportCsv(selectedAnalysisId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `anomalies_export_${selectedAnalysisId}.csv`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      toast.success('Anomalies CSV exported successfully')
    } catch {
      toast.error('Failed to export CSV')
    }
  };

  const currentAnalysis = completedAnalyses.find(a => a.id === selectedAnalysisId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            Anomaly Explorer
          </h1>
          <p className="text-gray-500 mt-1">
            Perform source data verification (SDV) audits on flagged statistical and rules-based outliers.
          </p>
        </div>

        {selectedAnalysisId && (
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 transition-all shadow-sm"
          >
            Export All to CSV
          </button>
        )}
      </div>

      {completedAnalyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center max-w-lg mx-auto mt-8 space-y-4">
          <ClipboardList className="w-12 h-12 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-900">No Analyses Completed Yet</h3>
          <p className="text-gray-500 text-xs leading-relaxed">
            You must run an anomaly detection pipeline on a dataset before you can audit anomalies in the explorer.
          </p>
          <Link 
            to="/analyses/new" 
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-xl flex items-center gap-2 transition-all shadow-sm"
          >
            Start Analysis <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selector Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="space-y-1">
              <label htmlFor="analysis-select" className="text-xs font-bold uppercase text-gray-500 block tracking-wider">
                Select Analysis Run
              </label>
              <select
                id="analysis-select"
                value={selectedAnalysisId}
                onChange={(e) => {
                  setSelectedAnalysisId(e.target.value)
                  setPage(1)
                }}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-750 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 min-w-[280px]"
              >
                {completedAnalyses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.dataset?.name || 'Dataset'} ({new Date(a.created_at).toLocaleDateString()}) - {a.total_anomalies_detected} anomalies
                  </option>
                ))}
              </select>
            </div>

            {currentAnalysis && (
              <div className="text-xs text-gray-500 space-y-1 border-t sm:border-t-0 sm:border-l border-gray-200 pt-3 sm:pt-0 sm:pl-4">
                <p>Dataset Name: <span className="font-semibold text-gray-900">{currentAnalysis.dataset?.name}</span></p>
                <p>Trial Phase: <span className="font-semibold text-gray-900">{currentAnalysis.dataset?.trial_phase || 'N/A'}</span></p>
                <p>Overall Quality Score: <span className="font-semibold text-emerald-600 font-mono">{currentAnalysis.overall_data_quality_score}%</span></p>
              </div>
            )}
          </div>

          {/* Table Explorer */}
          {selectedAnalysisId && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Filter className="w-4 h-4 text-gray-900" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Audit Records</h3>
              </div>

              <AnomalyTable 
                anomalies={anomalies}
                total={total}
                page={page}
                pageSize={10}
                onPageChange={setPage}
                onSeverityFilter={(sev) => {
                  setSeverity(sev)
                  setPage(1)
                }}
                onUpdate={handleUpdateAnomaly}
                isLoading={isLoadingAnoms}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
