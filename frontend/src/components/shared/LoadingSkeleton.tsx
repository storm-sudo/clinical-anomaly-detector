interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'text' | 'stat'
  rows?: number
  className?: string
}

export default function LoadingSkeleton({ variant = 'card', rows = 3, className = '' }: LoadingSkeletonProps) {
  if (variant === 'stat') {
    return (
      <div className={`stat-card ${className}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="skeleton w-10 h-10 rounded-lg" />
          <div className="skeleton w-16 h-5 rounded-full" />
        </div>
        <div className="skeleton w-24 h-8 rounded mb-2" />
        <div className="skeleton w-32 h-4 rounded" />
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className={`glass-card overflow-hidden ${className}`}>
        <div className="p-4 border-b border-gray-100">
          <div className="skeleton w-40 h-5 rounded" />
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {[...Array(5)].map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(rows)].map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-gray-100">
                {[...Array(5)].map((_, colIdx) => (
                  <td key={colIdx} className="px-4 py-3">
                    <div
                      className="skeleton h-4 rounded"
                      style={{ width: `${40 + Math.random() * 50}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {[...Array(rows)].map((_, i) => (
          <div
            key={i}
            className="skeleton h-4 rounded"
            style={{ width: `${50 + Math.random() * 50}%` }}
          />
        ))}
      </div>
    )
  }

  // card variant
  return (
    <div className={`glass-card p-5 ${className}`}>
      <div className="skeleton w-1/3 h-5 rounded mb-4" />
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex gap-3 items-center">
            <div className="skeleton w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 rounded w-3/4" />
              <div className="skeleton h-3 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PageLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <LoadingSkeleton key={i} variant="stat" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <LoadingSkeleton variant="card" rows={5} className="h-64" />
        </div>
        <LoadingSkeleton variant="card" rows={4} />
      </div>
      <LoadingSkeleton variant="table" rows={6} />
    </div>
  )
}
