import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAnalysisStore } from '../stores/analysisStore'
import { usePolling } from '../hooks/usePolling'
import { analysesApi } from '../api/analyses'
import { anomaliesApi } from '../api/anomalies'
import { 
  FileText, 
  Download, 
  BarChart2, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Info,
  Clock,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  RotateCcw
} from 'lucide-react'
import toast from 'react-hot-toast'

// Components
import ProcessingStatus from '../components/analysis/ProcessingStatus'
import QualityScoreCard from '../components/analysis/QualityScoreCard'
import { SeverityDonut } from '../components/charts/SeverityDonut'
import { AnomalyBarChart } from '../components/charts/AnomalyBarChart'
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart'
import { AnomalyTable } from '../components/anomalies/AnomalyTable'
import type { Anomaly, AnomalySeverity } from '../types'

export default function AnalysisDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentAnalysis, fetchAnalysis, deleteAnalysis } = useAnalysisStore()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'explorer' | 'report'>('overview')
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [totalAnomalies, setTotalAnomalies] = useState(0)
  const [anomalyPage, setAnomalyPage] = useState(1)
  const [anomalySeverity, setAnomalySeverity] = useState<string>('')
  const [selectedChartCol, setSelectedChartCol] = useState<string>('')
  
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // 1. Setup polling for status while pending/processing
  const fetchStatus = async () => {
    if (!id) return null
    return await analysesApi.get(id)
  };

  const shouldStopPolling = (analysis: any) => {
    return analysis && (analysis.status === 'COMPLETED' || analysis.status === 'FAILED')
  };

  const { data: polledAnalysis, isPolling } = usePolling(
    fetchStatus,
    shouldStopPolling,
    3000
  )

  // Sync polling result to Zustand store
  useEffect(() => {
    if (polledAnalysis) {
      useAnalysisStore.setState({ currentAnalysis: polledAnalysis })
    }
  }, [polledAnalysis])

  // Initial fetch of full details
  useEffect(() => {
    if (id) {
      fetchAnalysis(id)
    }
  }, [id, fetchAnalysis])

  // Fetch anomalies for table when page, filters, or analysis changes
  const fetchAnomaliesList = async () => {
    if (!id || (currentAnalysis && currentAnalysis.status !== 'COMPLETED')) return
    try {
      const res = await anomaliesApi.getForAnalysis(id, {
        page: anomalyPage,
        size: 10,
        severity: anomalySeverity || undefined
      })
      setAnomalies(res.items)
      setTotalAnomalies(res.total)
    } catch {
      toast.error('Failed to load anomalies')
    }
  };

  useEffect(() => {
    fetchAnomaliesList()
  }, [id, anomalyPage, anomalySeverity, currentAnalysis?.status])

  // Default select first column for TimeSeries chart
  useEffect(() => {
    if (currentAnalysis?.dataset?.columns && currentAnalysis.dataset.columns.length > 0) {
      // Find first numeric column
      const cols = currentAnalysis.dataset.columns
      const types = currentAnalysis.dataset.column_types || {}
      const firstNumeric = cols.find(c => types[c] === 'numeric')
      setSelectedChartCol(firstNumeric || cols[0])
    }
  }, [currentAnalysis])

  const handleUpdateAnomaly = (updatedAnom: Anomaly) => {
    // Update local state
    setAnomalies(anomalies.map(a => a.id === updatedAnom.id ? updatedAnom : a))
    // Refetch summary/details in background to update score ring
    if (id) fetchAnalysis(id)
  };

  const handleDownloadPDF = async () => {
    if (!id) return
    setIsDownloading(true)
    try {
      const blob = await analysesApi.downloadReport(id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `clinical_analysis_report_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      toast.success('Report PDF downloaded successfully')
    } catch {
      toast.error('Failed to download PDF report')
    } finally {
      setIsDownloading(false)
    }
  };

  const handleGeneratePDF = async () => {
    if (!id) return
    setIsGeneratingReport(true)
    try {
      await analysesApi.generateReport(id)
      await fetchAnalysis(id) // Reload analysis metadata
      toast.success('Report compiled successfully')
    } catch {
      toast.error('Failed to compile report PDF')
    } finally {
      setIsGeneratingReport(false)
    }
  };

  const handleExportCSV = async () => {
    if (!id) return
    try {
      const blob = await anomaliesApi.exportCsv(id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `anomalies_export_${id}.csv`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      toast.success('Anomalies CSV exported successfully')
    } catch {
      toast.error('Failed to export CSV')
    }
  };

  // Render PENDING / PROCESSING state
  if (currentAnalysis && (currentAnalysis.status === 'PENDING' || currentAnalysis.status === 'PROCESSING')) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ProcessingStatus status={currentAnalysis.status} />
      </div>
    )
  }

  // Render FAILED state
  if (currentAnalysis && currentAnalysis.status === 'FAILED') {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Analysis Failed</h2>
        <p className="text-gray-500 text-sm">
          {currentAnalysis.error_message || 'An error occurred during pipeline execution. Please verify your dataset structure.'}
        </p>
        <div className="pt-4 flex justify-center gap-3">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-all"
          >
            Back to Dashboard
          </button>
          <button 
            onClick={() => navigate(`/analyses/new?dataset_id=${currentAnalysis.dataset_id}`)}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RotateCcw className="w-4 h-4" /> Retry Configuration
          </button>
        </div>
      </div>
    )
  }

  if (!currentAnalysis) {
    return null
  }

  // Format timeseries chart data from dataset preview
  const dataset = currentAnalysis.dataset
  const previewRows = dataset?.preview_data || []
  const timepointCol = dataset?.timepoint_column || 'timepoint'
  const subjectIdCol = dataset?.subject_id_column || 'subject_id'

  const chartData = previewRows
    .map((row: any, idx: number) => {
      const val = Number(row[selectedChartCol])
      return {
        timepoint: String(row[timepointCol] || idx),
        value: isNaN(val) ? 0 : val,
        isAnomaly: anomalies.some(a => a.row_index === idx && a.column_name === selectedChartCol),
        subjectId: String(row[subjectIdCol] || '')
      }
    })
    // Sort chronologically if timepoint can be cast as numeric or date
    .sort((a: any, b: any) => {
      const nA = Number(a.timepoint)
      const nB = Number(b.timepoint)
      if (!isNaN(nA) && !isNaN(nB)) return nA - nB
      return a.timepoint.localeCompare(b.timepoint)
    })

  // Expected range reference markers
  const stats = currentAnalysis.column_statistics?.[selectedChartCol]
  const expectedMin = stats?.mean && stats?.std ? stats.mean - 3 * stats.std : undefined
  const expectedMax = stats?.mean && stats?.std ? stats.mean + 3 * stats.std : undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-sm mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            Analysis Results
            <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-lg border border-gray-200 font-medium">
              {currentAnalysis.id.substring(0, 8)}
            </span>
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Executed on dataset: <span className="font-semibold text-gray-900">{dataset?.name}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          
          {currentAnalysis.report_s3_url ? (
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Download PDF Report
            </button>
          ) : (
            <button 
              onClick={handleGeneratePDF}
              disabled={isGeneratingReport}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
            >
              {isGeneratingReport ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Compile PDF Report
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50/50 px-4 pt-3 gap-2 rounded-t-2xl">
        {[
          { key: 'overview', label: 'Executive Overview', icon: Info },
          { key: 'charts', label: 'Data Visualizations', icon: BarChart2 },
          { key: 'explorer', label: 'Anomaly Explorer', icon: AlertTriangle },
          { key: 'report', label: 'Compliance Report', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 -mb-[1px] ${
                isActive
                  ? 'bg-white border-t border-x border-gray-200 text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Quality Score Ring */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center">
              <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider">Overall Data Quality</h3>
              <QualityScoreCard analysis={currentAnalysis} />
              <div className="grid grid-cols-3 gap-4 mt-6 w-full text-center border-t border-gray-100 pt-4">
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Analyzed Rows</span>
                  <span className="text-base font-bold text-gray-900">{currentAnalysis.total_rows_analyzed.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Outliers</span>
                  <span className="text-base font-bold text-gray-900">{currentAnalysis.total_anomalies_detected}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Outlier Rate</span>
                  <span className="text-base font-bold text-gray-900">{currentAnalysis.anomaly_rate_percent.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Middle: Actionable Recommendations */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Actionable Recommendations</h3>
              <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-2">
                {currentAnalysis.recommendations && currentAnalysis.recommendations.length > 0 ? (
                  currentAnalysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-700 leading-relaxed">{rec}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400">No warnings or recommendations triggered.</p>
                )}
              </div>
            </div>

            {/* Right: Detector Algorithms Run stats */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detector Status</h3>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {Object.entries(currentAnalysis.algorithm_results || {}).map(([algo, res]) => (
                  <div key={algo} className="flex items-center justify-between text-xs py-2 border-b border-gray-100 last:border-0">
                    <span className="font-semibold capitalize text-gray-750">{algo.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        res.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {res.status === 'completed' ? 'PASS' : 'FAILED'}
                      </span>
                      {res.status === 'completed' && (
                        <span className="text-gray-400 font-mono">({res.count} anomalies)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Severity Donut */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Anomaly Proportions by Severity</h3>
                <SeverityDonut summary={currentAnalysis.anomaly_summary} />
              </div>

              {/* Column Bar Chart */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Anomaly Distribution by Column</h3>
                <AnomalyBarChart data={currentAnalysis.anomaly_summary.by_column} />
              </div>
            </div>

            {/* Longitudinal Trend Chart */}
            {previewRows.length > 0 && selectedChartCol && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-900" /> Longitudinal Trend & Deviations
                  </h3>
                  <select
                    value={selectedChartCol}
                    onChange={(e) => setSelectedChartCol(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-705 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
                  >
                    {currentAnalysis.dataset?.columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <TimeSeriesChart 
                    data={chartData} 
                    referenceMin={expectedMin} 
                    referenceMax={expectedMax} 
                    columnName={selectedChartCol}
                  />
                  <p className="text-[10px] text-gray-400 text-center italic">
                    Visualizing values across timepoints. Red indicators represent ensembled anomalies.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'explorer' && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Anomaly Explorer</h3>
            <AnomalyTable 
              anomalies={anomalies}
              total={totalAnomalies}
              page={anomalyPage}
              pageSize={10}
              onPageChange={setAnomalyPage}
              onSeverityFilter={setAnomalySeverity}
              onUpdate={handleUpdateAnomaly}
            />
          </div>
        )}

        {activeTab === 'report' && (
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-xl text-gray-900">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Compliance & Validation Report</h3>
                <p className="text-xs text-gray-500">Generate, review, and print compliance-ready validation reports.</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-4">
              <p className="text-xs text-gray-700 leading-relaxed">
                The report includes an executive summary of clinical trial data quality, algorithm parameters, out-of-range vital/lab analyses, audit trails, and investigator recommendations.
              </p>

              <div className="bg-gray-50 p-4 border border-gray-100 rounded-xl text-xs space-y-3">
                <h4 className="font-bold text-gray-900">Report Status</h4>
                <div className="flex items-center justify-between border-b border-gray-200/50 pb-2">
                  <span className="text-gray-600">PDF Document Compiled</span>
                  <span className="font-semibold text-gray-800">
                    {currentAnalysis.report_s3_url ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">File Location</span>
                  <span className="font-mono text-gray-500 text-[10px]">
                    {currentAnalysis.report_s3_url ? currentAnalysis.report_s3_key : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                {!currentAnalysis.report_s3_url ? (
                  <button 
                    onClick={handleGeneratePDF}
                    disabled={isGeneratingReport}
                    className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm"
                  >
                    {isGeneratingReport ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    Compile PDF Document
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={handleGeneratePDF}
                      disabled={isGeneratingReport}
                      className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition-all"
                    >
                      Recompile Report
                    </button>
                    <button 
                      onClick={handleDownloadPDF}
                      disabled={isDownloading}
                      className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF Report
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
