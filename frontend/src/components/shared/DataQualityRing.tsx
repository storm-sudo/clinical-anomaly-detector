import { useEffect, useRef } from 'react'
import anime from 'animejs'
import { getScoreColor } from '../../utils/colors'

interface DataQualityRingProps {
  score: number
  size?: number
  strokeWidth?: number
  animate?: boolean
  label?: string
  showLabel?: boolean
}

export function DataQualityRing({
  score,
  size = 120,
  strokeWidth = 8,
  animate = true,
  label,
  showLabel = true,
}: DataQualityRingProps) {
  const circleRef = useRef<SVGCircleElement>(null)
  const scoreRef = useRef<HTMLSpanElement>(null)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const color = getScoreColor(score)

  useEffect(() => {
    if (!circleRef.current) return
    const offset = circumference - (score / 100) * circumference

    if (animate) {
      anime({
        targets: circleRef.current,
        strokeDashoffset: [circumference, offset],
        duration: 1500,
        easing: 'easeInOutCubic',
      })
    } else {
      circleRef.current.style.strokeDashoffset = String(offset)
    }

    if (scoreRef.current && animate) {
      const obj = { val: 0 }
      anime({
        targets: obj,
        val: score,
        duration: 1500,
        easing: 'easeOutExpo',
        update: () => {
          if (scoreRef.current) {
            scoreRef.current.textContent = Math.round(obj.val).toString()
          }
        },
      })
    }
  }, [score, circumference, animate])

  const getScoreLabel = (s: number) => {
    if (s >= 85) return 'Excellent'
    if (s >= 70) return 'Good'
    if (s >= 50) return 'Fair'
    if (s >= 30) return 'Poor'
    return 'Critical'
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#F2ECE2"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            ref={circleRef}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animate ? circumference : circumference - (score / 100) * circumference}
            style={{
              transition: animate ? 'none' : 'stroke-dashoffset 0.5s',
            }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            ref={scoreRef}
            className="text-2xl font-bold"
            style={{ color }}
          >
            {animate ? '0' : Math.round(score)}
          </span>
          <span className="text-xs text-gray-400 font-medium">/ 100</span>
        </div>
      </div>
      {showLabel && (
        <div className="text-center">
          <div className="text-xs font-semibold" style={{ color }}>
            {getScoreLabel(score)}
          </div>
          {label && <div className="text-xs text-gray-500 mt-0.5">{label}</div>}
        </div>
      )}
    </div>
  )
}
