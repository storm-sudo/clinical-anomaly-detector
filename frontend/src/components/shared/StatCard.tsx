import { useEffect, useRef } from 'react'
import anime from 'animejs'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  color?: 'blue' | 'red' | 'green' | 'amber' | 'purple'
  trend?: { value: number; label: string }
  animate?: boolean
  suffix?: string
  className?: string
}

const colorMap = {
  blue: {
    icon: 'text-sky-600',
    bg: 'bg-sky-100',
    border: 'border-gray-100',
    glow: '',
  },
  red: {
    icon: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-100',
    glow: '',
  },
  green: {
    icon: 'text-emerald-600',
    bg: 'bg-emerald-100',
    border: 'border-gray-100',
    glow: '',
  },
  amber: {
    icon: 'text-amber-600',
    bg: 'bg-amber-100',
    border: 'border-gray-100',
    glow: '',
  },
  purple: {
    icon: 'text-violet-600',
    bg: 'bg-violet-100',
    border: 'border-gray-100',
    glow: '',
  },
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  animate = true,
  suffix = '',
  className = '',
}: StatCardProps) {
  const valueRef = useRef<HTMLSpanElement>(null)
  const colors = colorMap[color]

  useEffect(() => {
    if (!animate || typeof value !== 'number' || !valueRef.current) return
    const obj = { val: 0 }
    const target = value as number
    const anim = anime({
      targets: obj,
      val: target,
      duration: 1500,
      easing: 'easeOutExpo',
      update: () => {
        if (valueRef.current) {
          const rounded = Number.isInteger(target)
            ? Math.round(obj.val)
            : parseFloat(obj.val.toFixed(1))
          valueRef.current.textContent = rounded.toLocaleString() + suffix
        }
      },
    })
    return () => anim.pause()
  }, [value, animate, suffix])

  return (
    <div
      className={`stat-card bg-white rounded-2xl p-5 border border-gray-100 shadow-md ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors.bg}`}
        >
          <Icon size={18} className={colors.icon} />
        </div>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.value >= 0
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                : 'text-red-700 bg-red-50 border border-red-200'
            }`}
          >
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>

      <div>
        <div className="text-3xl font-bold text-gray-900 mb-1">
          {typeof value === 'number' ? (
            <span ref={valueRef}>{animate ? '0' : value.toLocaleString() + suffix}</span>
          ) : (
            <span>{value}{suffix}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
      </div>
    </div>
  )
}
