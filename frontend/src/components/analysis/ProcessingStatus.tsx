import { useEffect, useRef } from 'react'
import anime from 'animejs'
import { CheckCircle, XCircle, Loader2, Circle } from 'lucide-react'

type StepStatus = 'pending' | 'running' | 'completed' | 'failed'

interface ProcessingStep {
  label: string
  status: StepStatus
  duration?: number
}

interface ProcessingStatusProps {
  status: string
  steps?: ProcessingStep[]
  estimatedSeconds?: number
}

const DEFAULT_STEPS: ProcessingStep[] = [
  { label: 'Loading dataset', status: 'pending' },
  { label: 'Preprocessing & validation', status: 'pending' },
  { label: 'Statistical detection (Z-Score / IQR)', status: 'pending' },
  { label: 'Isolation Forest', status: 'pending' },
  { label: 'Local Outlier Factor', status: 'pending' },
  { label: 'Clinical rules engine', status: 'pending' },
  { label: 'Generating report', status: 'pending' },
]

function deriveSteps(status: string): ProcessingStep[] {
  if (status === 'PENDING') return DEFAULT_STEPS
  if (status === 'FAILED') {
    return DEFAULT_STEPS.map((s, i) => ({
      ...s,
      status: i === 0 ? 'failed' : 'pending',
    }))
  }
  if (status === 'COMPLETED') {
    return DEFAULT_STEPS.map((s) => ({ ...s, status: 'completed' }))
  }
  // PROCESSING: simulate progress
  const completedCount = Math.floor(Math.random() * 4) + 1
  return DEFAULT_STEPS.map((s, i) => ({
    ...s,
    status: i < completedCount ? 'completed' : i === completedCount ? 'running' : 'pending',
  }))
}

export default function ProcessingStatus({ status, steps, estimatedSeconds }: ProcessingStatusProps) {
  const stepsRef = useRef<HTMLDivElement>(null)
  const displaySteps = steps ?? deriveSteps(status)

  useEffect(() => {
    if (!stepsRef.current) return
    anime({
      targets: stepsRef.current.querySelectorAll('.processing-step'),
      opacity: [0, 1],
      translateY: [8, 0],
      delay: anime.stagger(120),
      duration: 500,
      easing: 'easeOutCubic',
    })
  }, [])

  const getIcon = (stepStatus: StepStatus) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
      case 'running':
        return <Loader2 size={18} className="text-blue-400 flex-shrink-0 animate-spin" />
      case 'failed':
        return <XCircle size={18} className="text-red-400 flex-shrink-0" />
      default:
        return <Circle size={18} className="text-slate-600 flex-shrink-0" />
    }
  }

  return (
    <div className="glass-card p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(59,130,246,0.1)' }}
        >
          <Loader2 size={20} className="text-blue-400 animate-spin" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-100">Analysis in Progress</h3>
          <p className="text-sm text-slate-400">
            {estimatedSeconds ? `~${estimatedSeconds}s remaining` : 'Running ML algorithms…'}
          </p>
        </div>
      </div>

      <div ref={stepsRef} className="space-y-3">
        {displaySteps.map((step, idx) => (
          <div
            key={idx}
            className={`processing-step flex items-center gap-3 p-3 rounded-lg transition-all ${
              step.status === 'running'
                ? 'bg-blue-500/8 border border-blue-500/20'
                : step.status === 'completed'
                ? 'opacity-70'
                : 'opacity-40'
            }`}
          >
            {getIcon(step.status)}
            <span
              className={`text-sm ${
                step.status === 'running'
                  ? 'text-blue-200 font-medium'
                  : step.status === 'completed'
                  ? 'text-slate-300 line-through decoration-slate-600'
                  : 'text-slate-500'
              }`}
            >
              {step.label}
            </span>
            {step.status === 'running' && (
              <div className="ml-auto flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-blue-400"
                    style={{
                      animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}
            {step.status === 'completed' && step.duration && (
              <span className="ml-auto text-xs text-slate-600">{step.duration}ms</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
