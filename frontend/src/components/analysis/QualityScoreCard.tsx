import { DataQualityRing } from '../shared/DataQualityRing'
import { AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react'
import { formatPercent } from '../../utils/formatters'
import { getScoreColor } from '../../utils/colors'
import type { Analysis } from '../../types'

interface QualityScoreCardProps {
  analysis: Analysis
  animate?: boolean
}

export default function QualityScoreCard({ analysis, animate = true }: QualityScoreCardProps) {
  const score = analysis.overall_data_quality_score
  const color = getScoreColor(score)

  const stats = [
    {
      label: 'Rows Analyzed',
      value: analysis.total_rows_analyzed.toLocaleString(),
      icon: BarChart2,
      color: '#3b82f6',
    },
    {
      label: 'Anomalies Found',
      value: analysis.total_anomalies_detected.toLocaleString(),
      icon: AlertTriangle,
      color: '#ef4444',
    },
    {
      label: 'Anomaly Rate',
      value: formatPercent(analysis.anomaly_rate_percent),
      icon: AlertTriangle,
      color: '#f59e0b',
    },
    {
      label: 'Algorithms Run',
      value: Object.keys(analysis.algorithm_results).length.toString(),
      icon: CheckCircle,
      color: '#10b981',
    },
  ]

  return (
    <div className="glass-card p-6">
      <div className="flex items-start gap-8">
        {/* Score ring */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <DataQualityRing score={score} size={140} strokeWidth={10} animate={animate} />
          <div className="mt-3 text-center">
            <div className="text-sm font-semibold" style={{ color }}>
              Data Quality Score
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-4"
              style={{
                background: `${stat.color}0d`,
                border: `1px solid ${stat.color}22`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={14} style={{ color: stat.color }} />
                <span className="text-xs text-slate-400">{stat.label}</span>
              </div>
              <div className="text-xl font-bold text-slate-100">{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Severity breakdown */}
      {analysis.anomaly_summary?.by_severity && (
        <div className="mt-6 pt-5 border-t border-white/5">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Severity Breakdown</div>
          <div className="flex gap-3">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
              const count = analysis.anomaly_summary.by_severity[sev] ?? 0
              const total = analysis.total_anomalies_detected
              const pct = total > 0 ? (count / total) * 100 : 0
              const colors = {
                CRITICAL: '#ef4444',
                HIGH: '#f59e0b',
                MEDIUM: '#3b82f6',
                LOW: '#10b981',
              }
              const c = colors[sev]
              return (
                <div key={sev} className="flex-1 text-center">
                  <div className="text-lg font-bold mb-1" style={{ color: c }}>{count}</div>
                  <div className="text-xs text-slate-500">{sev}</div>
                  <div className="h-1 rounded-full mt-2 bg-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: c }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
