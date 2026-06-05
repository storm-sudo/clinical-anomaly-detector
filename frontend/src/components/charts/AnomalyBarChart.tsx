import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface AnomalyBarChartProps {
  data: Record<string, number>
  title?: string
  maxItems?: number
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-lg text-sm"
        style={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="text-slate-300 font-medium">{label}</div>
        <div className="text-blue-300">{payload[0].value} anomalies</div>
      </div>
    )
  }
  return null
}

export function AnomalyBarChart({ data, maxItems = 10 }: AnomalyBarChartProps) {
  const sorted = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxItems)
    .map(([col, count]) => ({ column: col, count }))

  const max = sorted[0]?.count ?? 1

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No column data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(sorted.length * 40, 120)}>
      <BarChart
        layout="vertical"
        data={sorted}
        margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
      >
        <XAxis type="number" hide domain={[0, max]} />
        <YAxis
          type="category"
          dataKey="column"
          width={110}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} animationDuration={1000}>
          {sorted.map((entry, index) => {
            const intensity = 1 - (index / sorted.length) * 0.5
            return (
              <Cell
                key={entry.column}
                fill={`rgba(59,130,246,${intensity})`}
                style={{ filter: index === 0 ? 'drop-shadow(0 0 6px rgba(59,130,246,0.4))' : 'none' }}
              />
            )
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
