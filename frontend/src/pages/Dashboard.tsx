import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import anime from 'animejs'
import {
  Database,
  Activity,
  AlertTriangle,
  Shield,
  Plus,
  ArrowRight,
  Clock,
  Upload,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { StatCard } from '../components/shared/StatCard'
import { SeverityBadge } from '../components/anomalies/SeverityBadge'
import { DropZone } from '../components/upload/DropZone'
import { useAuthStore } from '../stores/authStore'
import { useAnalysisStore } from '../stores/analysisStore'
import { useDatasetStore } from '../stores/datasetStore'
import { formatDate, formatRelativeTime, formatDuration } from '../utils/formatters'
import { getStatusColor, getStatusBgColor } from '../utils/colors'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { dashboardStats, fetchDashboardStats } = useAnalysisStore()
  const { uploadDataset, isUploading, uploadProgress } = useDatasetStore()
  const cardsRef = useRef<HTMLDivElement>(null)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    fetchDashboardStats()
  }, [fetchDashboardStats])

  useEffect(() => {
    if (cardsRef.current) {
      anime({
        targets: cardsRef.current.querySelectorAll('.stat-card'),
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(100),
        duration: 600,
        easing: 'easeOutCubic',
      })
    }
  }, [])

  const stats = dashboardStats ?? {
    total_datasets: 0,
    total_analyses: 0,
    total_anomalies: 0,
    avg_quality_score: 0,
    recent_analyses: [],
    recent_anomalies: [],
    anomalies_by_day: [],
  }

  // Mock chart data if no real data
  const chartData = stats.anomalies_by_day.length > 0
    ? stats.anomalies_by_day
    : Array.from({ length: 30 }, (_, i) => ({
        date: `Day ${i + 1}`,
        count: Math.floor(Math.random() * 50 + 10),
      }))

  const handleUpload = async (file: File) => {
    const dataset = await uploadDataset(file)
    if (dataset) {
      navigate(`/datasets/${dataset.id}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {user?.name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="btn-secondary flex items-center gap-2"
          >
            <Upload size={15} />
            Quick Upload
          </button>
          <Link to="/analyses/new" className="btn-primary">
            <Plus size={15} />
            New Analysis
          </Link>
        </div>
      </div>

      {/* Quick upload panel */}
      {showUpload && (
        <div className="glass-card p-5 bg-white border border-gray-100 shadow-md">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Upload Dataset</h3>
          <DropZone
            onFileAccepted={handleUpload}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        </div>
      )}

      {/* Stat cards */}
      <div ref={cardsRef} className="grid grid-cols-12 gap-3">
        <StatCard
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Total Datasets"
          value={stats.total_datasets}
          icon={Database}
          color="blue"
        />
        <StatCard
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Total Analyses"
          value={stats.total_analyses}
          icon={Activity}
          color="purple"
        />
        <StatCard
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Anomalies Detected"
          value={stats.total_anomalies}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Avg Quality Score"
          value={stats.avg_quality_score}
          icon={Shield}
          color="green"
          suffix="/100"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-5">
        {/* Anomaly trend chart */}
        <div className="col-span-2 glass-card p-5 bg-white border border-gray-100 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Anomalies Detected</h3>
              <p className="text-xs text-gray-500 mt-0.5">Last 30 days</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-0.5 bg-gray-900 rounded" />
              Daily count
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#111111" stopOpacity={0.05} />
                  <stop offset="95%" stopColor="#111111" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F2ECE2" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#9C9284', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#9C9284', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #E6E1DA',
                  borderRadius: 12,
                  fontSize: 12,
                  color: '#111111',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#111111"
                strokeWidth={2}
                fill="url(#anomalyGrad)"
                dot={false}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent critical anomalies */}
        <div className="glass-card p-5 bg-white border border-gray-100 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Critical Anomalies</h3>
            <Link to="/anomalies" className="text-xs text-sky-600 hover:underline flex items-center gap-1 font-semibold">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recent_anomalies.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No anomalies yet</p>
            ) : (
              stats.recent_anomalies.slice(0, 5).map((anomaly) => (
                <div
                  key={anomaly.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-red-50/50 border border-red-100/50 hover:bg-red-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-900 truncate">
                      {anomaly.column_name}
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">
                      Row #{anomaly.row_index} · {anomaly.value}
                    </div>
                  </div>
                  <SeverityBadge severity={anomaly.severity} size="sm" animate />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent analyses */}
      <div className="glass-card overflow-hidden bg-white border border-gray-100 shadow-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Recent Analyses</h3>
          <Link to="/analyses/new" className="text-xs text-sky-600 hover:underline flex items-center gap-1 font-semibold">
            New analysis <ArrowRight size={11} />
          </Link>
        </div>

        {stats.recent_analyses.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Activity size={28} className="text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No analyses yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload a dataset and run your first analysis</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Dataset</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-right">Rows</th>
                  <th className="px-5 py-3 text-right">Anomalies</th>
                  <th className="px-5 py-3 text-center">Quality</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Time</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_analyses.map((analysis) => (
                  <tr
                    key={analysis.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-900 truncate max-w-32">
                        {analysis.dataset?.name ?? 'Dataset'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-gray-400" />
                        {formatRelativeTime(analysis.created_at)}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-gray-700 text-xs">
                      {analysis.total_rows_analyzed.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-bold text-red-600">
                        {analysis.total_anomalies_detected}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className="font-bold text-sm"
                        style={{
                          color:
                            analysis.overall_data_quality_score >= 70
                              ? '#10b981'
                              : analysis.overall_data_quality_score >= 40
                              ? '#f59e0b'
                              : '#ef4444',
                        }}
                      >
                        {analysis.overall_data_quality_score.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                        style={{
                          color: getStatusColor(analysis.status),
                          background: getStatusBgColor(analysis.status),
                          border: `1px solid ${getStatusColor(analysis.status)}33`,
                        }}
                      >
                        {analysis.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-xs text-gray-500 font-mono">
                      {formatDuration(analysis.processing_time_seconds)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Link
                        to={`/analyses/${analysis.id}`}
                        className="text-xs text-sky-600 hover:underline transition-colors font-semibold"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
