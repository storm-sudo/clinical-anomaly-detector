import type { LucideIcon } from 'lucide-react'
import { FolderOpen } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  className?: string
}

export function EmptyState({ icon: Icon = FolderOpen, title, subtitle, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-gray-100 border border-gray-200 text-gray-500"
      >
        <Icon size={28} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 max-w-sm mb-6">{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary"
        >
          {action.icon && <action.icon size={16} />}
          {action.label}
        </button>
      )}
    </div>
  )
}
