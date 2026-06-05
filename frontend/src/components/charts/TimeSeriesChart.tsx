import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
  Scatter,
} from 'recharts'
import type { Anomaly } from '../../types'

interface TimeSeriesPoint {
  timepoint: string | number
  value: number
  isAnomaly?: boolean
  subjectId?: string
}

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[]
  anomalies?: Anomaly[]
  referenceMin?: number
  referenceMax?: number
  columnName?: string
  showBrush?: boolean
}

const CustomDot = (props: {
  cx?: number
  cy?: number
  payload?: TimeSeriesPoint
}) => {
  const { cx, cy, payload } = props
  if (!cx || !cy) return null
  if (payload?.isAnomaly) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fca5a5" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={10} fill="rgba(239,68,68,0.15)" />
      </g>
    )
  }
  return <circle cx={cx} cy={cy} r={3} fill="#3b82f6" />
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; payload: TimeSeriesPoint }[]
  label?: string
}) => {
  if (active && payload && payload.length) {
    const p = payload[0]
    return (
      <div
        className="px-3 py-2 rounded-lg text-sm"
        style={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="text-slate-400 text-xs mb-1">{label}</div>
        <div className={`font-semibold ${p.payload.isAnomaly ? 'text-red-400' : 'text-blue-300'}`}>
          {p.value}
          {p.payload.isAnomaly && ' ⚠ ANOMALY'}
        </div>
        {p.payload.subjectId && (
          <div className="text-slate-500 text-xs">Subject: {p.payload.subjectId}</div>
        )}
      </div>
    )
  }
  return null
}

export function TimeSeriesChart({
  data,
  referenceMin,
  referenceMax,
  columnName,
  showBrush = true,
}: TimeSeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: showBrush ? 40 : 8, left: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <XAxis
          dataKey="timepoint"
          tick={{ fill: '#475569', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#475569', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          label={columnName ? { value: columnName, angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 11 } : undefined}
        />
        <Tooltip content={<CustomTooltip />} />
        {referenceMin !== undefined && (
          <ReferenceLine
            y={referenceMin}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: 'Min', fill: '#f59e0b', fontSize: 10 }}
          />
        )}
        {referenceMax !== undefined && (
          <ReferenceLine
            y={referenceMax}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: 'Max', fill: '#f59e0b', fontSize: 10 }}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 5, fill: '#60a5fa' }}
          animationDuration={1200}
        />
        {showBrush && data.length > 20 && (
          <Brush
            dataKey="timepoint"
            height={24}
            stroke="rgba(255,255,255,0.1)"
            fill="#0f1629"
            travellerWidth={6}
          />
        )}
        <Scatter dataKey="anomalyMarker" fill="#ef4444" />
      </LineChart>
    </ResponsiveContainer>
  )
}
