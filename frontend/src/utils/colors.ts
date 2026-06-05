export function getSeverityColor(severity: string): string {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return '#ef4444' // red-500
    case 'HIGH': return '#f59e0b' // amber-500
    case 'MEDIUM': return '#0ea5e9' // sky-500
    case 'LOW': return '#10b981' // emerald-500
    default: return '#6B6459' // warm gray
  }
}

export function getSeverityBgColor(severity: string): string {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return '#fef2f2' // bg-red-50
    case 'HIGH': return '#fffbeb' // bg-amber-50
    case 'MEDIUM': return '#f0f9ff' // bg-sky-50
    case 'LOW': return '#ecfdf5' // bg-emerald-50
    default: return '#FAF7F2' // warm cream
  }
}

export function getSeverityBorderColor(severity: string): string {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return '#fecaca' // border-red-200
    case 'HIGH': return '#fde68a' // border-amber-200
    case 'MEDIUM': return '#bae6fd' // border-sky-200
    case 'LOW': return '#a7f3d0' // border-emerald-200
    default: return '#E6E1DA' // cream border
  }
}

export function getScoreColor(score: number): string {
  if (score >= 70) return '#10b981'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

export function getScoreGradient(score: number): string {
  if (score >= 70) return 'from-emerald-500 to-green-400'
  if (score >= 40) return 'from-amber-500 to-yellow-400'
  return 'from-red-500 to-rose-400'
}

export function getStatusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'COMPLETED': return '#10b981'
    case 'PROCESSING': return '#0ea5e9'
    case 'PENDING': return '#f59e0b'
    case 'FAILED': return '#ef4444'
    default: return '#6B6459' // warm gray
  }
}

export function getStatusBgColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'COMPLETED': return '#ecfdf5'
    case 'PROCESSING': return '#f0f9ff'
    case 'PENDING': return '#fffbeb'
    case 'FAILED': return '#fef2f2'
    default: return '#FAF7F2' // warm cream
  }
}

export function getColumnTypeColor(dtype: string): string {
  if (dtype.includes('float') || dtype.includes('int')) return '#3b82f6'
  if (dtype.includes('object') || dtype.includes('str')) return '#a78bfa'
  if (dtype.includes('datetime') || dtype.includes('date')) return '#10b981'
  if (dtype.includes('bool')) return '#f59e0b'
  return '#9C9284' // warm muted gray
}
