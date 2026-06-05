export interface User {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
  organization?: string
  is_active: boolean
  created_at: string
}

export interface Dataset {
  id: string
  name: string
  original_filename: string
  file_size_bytes: number
  row_count: number
  column_count: number
  columns: string[]
  column_types: Record<string, string>
  missing_value_summary: Record<string, number>
  preview_data: Record<string, unknown>[]
  trial_name?: string
  trial_phase?: string
  data_type?: string
  timepoint_column?: string
  subject_id_column?: string
  created_at: string
  analyses_count?: number
}

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface Analysis {
  id: string
  dataset_id: string
  dataset?: Dataset
  status: AnalysisStatus
  config: AnalysisConfig
  total_rows_analyzed: number
  total_anomalies_detected: number
  anomaly_rate_percent: number
  overall_data_quality_score: number
  column_statistics: Record<string, ColumnStats>
  algorithm_results: Record<string, AlgorithmResult>
  anomaly_summary: AnomalySummary
  recommendations: string[]
  processing_time_seconds: number
  created_at: string
  error_message?: string
  report_s3_key?: string
  report_s3_url?: string
}

export interface ColumnStats {
  count: number
  missing_count: number
  missing_percent: number
  mean?: number
  median?: number
  std?: number
  min?: number
  max?: number
  skewness?: number
  unique_count: number
  dtype: string
}

export interface AlgorithmResult {
  count: number
  status: 'completed' | 'failed'
  error?: string
}

export interface AnomalySummary {
  total: number
  by_severity: Record<AnomalySeverity, number>
  by_column: Record<string, number>
  by_method: Record<string, number>
}

export interface Anomaly {
  id: string
  analysis_id: string
  row_index: number
  column_name: string
  subject_id?: string
  value: string
  expected_range_min?: number
  expected_range_max?: number
  z_score?: number
  anomaly_score: number
  severity: AnomalySeverity
  detection_method: string
  anomaly_type: string
  clinical_significance?: string
  suggested_action?: string
  is_reviewed: boolean
  is_false_positive?: boolean
  created_at: string
}

export interface AnalysisConfig {
  dataset_id: string
  columns_to_analyze: string[]
  run_statistical: boolean
  run_isolation_forest: boolean
  run_lof: boolean
  run_missing_analysis: boolean
  run_duplicate_check: boolean
  run_clinical_rules: boolean
  contamination: number
  zscore_threshold: number
  iqr_factor: number
  min_anomaly_score: number
  data_type: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface ApiError {
  detail: string
  status_code?: number
}

export interface DashboardStats {
  total_datasets: number
  total_analyses: number
  total_anomalies: number
  avg_quality_score: number
  recent_analyses: Analysis[]
  recent_anomalies: Anomaly[]
  anomalies_by_day: { date: string; count: number }[]
}
