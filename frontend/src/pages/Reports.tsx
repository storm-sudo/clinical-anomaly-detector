import React, { useEffect, useState } from 'react'
import { useAnalysisStore } from '../stores/analysisStore'
import { analysesApi } from '../api/analyses'
import { FileText, Download, PlayCircle, Calendar, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import LoadingSkeleton from '../components/shared/LoadingSkeleton'

export default function Reports() {
  const { analyses, fetchAnalyses, isLoading } = useAnalysisStore()
  const [compilingIds, setCompilingIds] = useState<Record<string, boolean>>({})
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchAnalyses({ size: 100 })
  }, [fetchAnalyses])

  const completedAnalyses = analyses.filter(a => a.status === 'COMPLETED')

  const handleGenerateReport = async (id: string) => {
    setCompilingIds(prev => ({ ...prev, [id]: true }))
    try {
      await analysesApi.generateReport(id)
      await fetchAnalyses({ size: 100 }) // Reload data
      toast.success('Validation report PDF compiled successfully')
    } catch {
      toast.error('Failed to compile report PDF')
    } finally {
      setCompilingIds(prev => ({ ...prev, [id]: false }))
    }
  };

  const handleDownloadReport = async (id: string) => {
    setDownloadingIds(prev => ({ ...prev, [id]: true }))
    try {
      const blob = await analysesApi.downloadReport(id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `clinical_validation_report_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      toast.success('Report downloaded successfully')
    } catch {
      toast.error('Failed to download report')
    } finally {
      setDownloadingIds(prev => ({ ...prev, [id]: false }))
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <FileText className="w-8 h-8 text-gray-900" />
          Clinical Validation Reports
        </h1>
        <p className="text-gray-500 mt-1">
          Compile and download compliance-ready PDF validation reports for regulatory reviews.
        </p>
      </div>

      {completedAnalyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center max-w-lg mx-auto mt-8 space-y-4">
          <AlertCircle className="w-12 h-12 text-gray-450" />
          <h3 className="text-lg font-bold text-gray-900">No Reports Available</h3>
          <p className="text-gray-500 text-xs">
            Run an anomaly detection analysis on a dataset to generate a validation report.
          </p>
          <Link 
            to="/analyses/new" 
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-xl shadow-sm transition-all"
          >
            Start New Analysis
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Trial / Dataset</th>
                  <th className="px-6 py-4">Date Completed</th>
                  <th className="px-6 py-4">Quality Score</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-250 text-gray-700">
                {completedAnalyses.map((analysis) => {
                  const isCompiling = compilingIds[analysis.id] || false;
                  const isDownloading = downloadingIds[analysis.id] || false;
                  const isCompiled = !!analysis.report_s3_url;
                  
                  return (
                    <tr key={analysis.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{analysis.dataset?.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5 font-sans">
                          {analysis.dataset?.trial_name || 'No Trial Program'} · {analysis.dataset?.trial_phase || 'Phase N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs ${
                          analysis.overall_data_quality_score >= 90 ? 'bg-emerald-55 text-emerald-700' :
                          analysis.overall_data_quality_score >= 75 ? 'bg-info-light text-info-dark' :
                          'bg-warning-light text-warning-dark'
                        }`}>
                          {analysis.overall_data_quality_score.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isCompiled ? (
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4" /> Compiled
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" /> Pending Compile
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link 
                            to={`/analyses/${analysis.id}`}
                            className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 transition-all shadow-sm"
                          >
                            View Details
                          </Link>

                          {isCompiled ? (
                            <button
                              onClick={() => handleDownloadReport(analysis.id)}
                              disabled={isDownloading}
                              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
                            >
                              {isDownloading ? (
                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              Download PDF
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGenerateReport(analysis.id)}
                              disabled={isCompiling}
                              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
                            >
                              {isCompiling ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <PlayCircle className="w-3.5 h-3.5" />
                              )}
                              Compile
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
