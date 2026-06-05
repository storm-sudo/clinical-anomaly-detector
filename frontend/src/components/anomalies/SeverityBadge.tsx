import { useEffect, useRef } from 'react'
import anime from 'animejs'
import type { AnomalySeverity } from '../../types'
import { getSeverityColor, getSeverityBgColor } from '../../utils/colors'

interface SeverityBadgeProps {
  severity: AnomalySeverity | string
  size?: 'sm' | 'md'
  animate?: boolean
}

export function SeverityBadge({ severity, size = 'md', animate = false }: SeverityBadgeProps) {
  const badgeRef = useRef<HTMLSpanElement>(null)
  const color = getSeverityColor(severity)
  const bgColor = getSeverityBgColor(severity)

  useEffect(() => {
    if (!animate || severity.toUpperCase() !== 'CRITICAL' || !badgeRef.current) return
    const anim = anime({
      targets: badgeRef.current,
      boxShadow: [
        `0 0 0px 0px ${color}44`,
        `0 0 12px 3px ${color}44`,
        `0 0 0px 0px ${color}44`,
      ],
      duration: 2000,
      loop: true,
      easing: 'easeInOutSine',
    })
    return () => anim.pause()
  }, [severity, color, animate])

  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
  const severityClass = `severity-${severity.toLowerCase()}`

  return (
    <span
      ref={badgeRef}
      className={`inline-flex items-center gap-1 font-semibold rounded-full uppercase tracking-wider ${sizeClass} ${severityClass}`}
    >
      {severity.toUpperCase() === 'CRITICAL' && (
        <span
          className="w-1.5 h-1.5 rounded-full inline-block bg-red-500 animate-pulse"
        />
      )}
      {severity.toUpperCase()}
    </span>
  )
}
