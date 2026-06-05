import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface HistogramBin {
  label: string
  count: number
  isAnomaly?: boolean
}

interface HistogramChartProps {
  data: HistogramBin[]
  columnName?: string
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; payload: HistogramBin }[]
  label?: string
}) => {
  if (active && payload && payload.length) {
    const p = payload[0]
    return (
      <div
        className="px-3 py-2 rounded-lg text-sm"
        style={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="text-slate-400 text-xs mb-1">Range: {label}</div>
        <div className={`font-semibold ${p.payload.isAnomaly ? 'text-red-400' : 'text-blue-300'}`}>
          {p.value} values
          {p.payload.isAnomaly && ' ⚠'}
        </div>
      </div>
    )
  }
  return null
}

export function HistogramChart({ data, columnName }: HistogramChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No distribution data available
      </div>
    )
  }

  return (
    <div>
      {columnName && (
        <div className="text-xs text-slate-500 mb-2">Distribution of <span className="text-blue-300">{columnName}</span></div>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} animationDuration={800}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isAnomaly ? '#ef4444' : 'rgba(59,130,246,0.6)'}
                style={{
                  filter: entry.isAnomaly
                    ? 'drop-shadow(0 0 6px rgba(239,68,68,0.5))'
                    : 'none',
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 justify-end">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <div className="w-3 h-2 rounded-sm bg-blue-500/60" />
          Normal range
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <div className="w-3 h-2 rounded-sm bg-red-500" />
          Anomalous values
        </div>
      </div>
    </div>
  )
}
