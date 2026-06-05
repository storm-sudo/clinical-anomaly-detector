import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { AnomalySummary } from '../../types'
import { getSeverityColor } from '../../utils/colors'

interface SeverityDonutProps {
  summary: AnomalySummary
}

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) => {
  if (active && payload && payload.length) {
    const item = payload[0]
    return (
      <div
        className="px-3 py-2 rounded-lg text-sm"
        style={{
          background: '#1a2035',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="font-semibold" style={{ color: item.payload.color }}>
          {item.name}
        </div>
        <div className="text-slate-300">{item.value} anomalies</div>
      </div>
    )
  }
  return null
}

const CustomLegend = ({ payload }: { payload?: { value: string; color: string }[] }) => {
  if (!payload) return null
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
          <span className="text-xs text-slate-400">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function SeverityDonut({ summary }: SeverityDonutProps) {
  const data = SEVERITY_ORDER
    .map((sev) => ({
      name: sev,
      value: summary.by_severity[sev] ?? 0,
      color: getSeverityColor(sev),
    }))
    .filter((d) => d.value > 0)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No anomalies detected
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="45%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          animationBegin={0}
          animationDuration={1200}
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.color}
              stroke="transparent"
              style={{ filter: `drop-shadow(0 0 6px ${entry.color}66)` }}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          content={<CustomLegend />}
          layout="vertical"
          align="right"
          verticalAlign="middle"
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
