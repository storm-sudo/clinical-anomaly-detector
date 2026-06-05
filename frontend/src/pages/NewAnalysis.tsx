import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useDatasetStore } from '../stores/datasetStore'
import { useAnalysisStore } from '../stores/analysisStore'
import { 
  Play, 
  Settings, 
  CheckSquare, 
  Square, 
  Sliders, 
  ChevronRight, 
  AlertCircle,
  FileText,
  HelpCircle,
  ArrowLeft
} from 'lucide-react'

export default function NewAnalysis() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const { datasets, fetchDatasets } = useDatasetStore()
  const { createAnalysis, isCreating } = useAnalysisStore()

  // State for dataset selection
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('')
  
  // State for algorithm toggles
  const [runStatistical, setRunStatistical] = useState(true)
  const [runIsolationForest, setRunIsolationForest] = useState(true)
  const [runLof, setRunLof] = useState(true)
  const [runMissingAnalysis, setRunMissingAnalysis] = useState(true)
  const [runDuplicateCheck, setRunDuplicateCheck] = useState(true)
  const [runClinicalRules, setRunClinicalRules] = useState(true)

  // State for parameters
  const [contamination, setContamination] = useState(0.05)
  const [zscoreThreshold, setZscoreThreshold] = useState(3.0)
  const [iqrFactor, setIqrFactor] = useState(1.5)
  const [minAnomalyScore, setMinAnomalyScore] = useState(0.3)
  const [dataType, setDataType] = useState('auto')
  
  // State for column selection
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])

  useEffect(() => {
    fetchDatasets({ size: 100 })
  }, [fetchDatasets])

  useEffect(() => {
    const queryId = searchParams.get('dataset_id')
    if (queryId) {
      setSelectedDatasetId(queryId)
    } else if (datasets.length > 0) {
      setSelectedDatasetId(datasets[0].id)
    }
  }, [searchParams, datasets])

  const currentDataset = datasets.find(d => d.id === selectedDatasetId)

  // Clear selected columns when dataset changes
  useEffect(() => {
    setSelectedColumns([])
  }, [selectedDatasetId])

  const handleToggleColumn = (col: string) => {
    if (selectedColumns.includes(col)) {
      setSelectedColumns(selectedColumns.filter(c => c !== col))
    } else {
      setSelectedColumns([...selectedColumns, col])
    }
  };

  const handleSelectAllColumns = () => {
    if (!currentDataset) return
    if (selectedColumns.length === currentDataset.columns.length) {
      setSelectedColumns([])
    } else {
      setSelectedColumns([...currentDataset.columns])
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDatasetId) return

    const config = {
      dataset_id: selectedDatasetId,
      columns_to_analyze: selectedColumns,
      run_statistical: runStatistical,
      run_isolation_forest: runIsolationForest,
      run_lof: runLof,
      run_missing_analysis: runMissingAnalysis,
      run_duplicate_check: runDuplicateCheck,
      run_clinical_rules: runClinicalRules,
      contamination: Number(contamination),
      zscore_threshold: Number(zscoreThreshold),
      iqr_factor: Number(iqrFactor),
      min_anomaly_score: Number(minAnomalyScore),
      data_type: dataType
    }

    const analysis = await createAnalysis(config)
    if (analysis) {
      navigate(`/analyses/${analysis.id}`)
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link to="/dashboard" className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-sm mb-2 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-gray-900 animate-spin-slow" />
          Configure New Analysis
        </h1>
        <p className="text-gray-500 mt-1">
          Set up algorithms and physiological ranges for automated quality control evaluation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Dataset */}
        <div className="glass-card p-6 space-y-4 bg-white border border-gray-100 shadow-md">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 flex items-center justify-center bg-gray-900 text-white rounded-full text-xs font-semibold">1</span>
            Select Dataset
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <label htmlFor="dataset" className="text-sm font-semibold text-gray-700">Target Dataset</label>
              <select
                id="dataset"
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-gray-900 text-sm focus:border-gray-900 focus:outline-none shadow-sm"
              >
                <option value="" disabled>-- Select a dataset --</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.original_filename})
                  </option>
                ))}
              </select>
            </div>

            {currentDataset && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                <p>Rows: <span className="font-bold text-gray-900">{(currentDataset.row_count || 0).toLocaleString()}</span></p>
                <p>Columns: <span className="font-bold text-gray-900">{currentDataset.columns?.length || 0}</span></p>
                {currentDataset.trial_name && (
                  <p>Trial: <span className="font-bold text-gray-800">{currentDataset.trial_name}</span></p>
                )}
              </div>
            )}
          </div>
        </div>

        {currentDataset && (
          <>
            {/* Step 2: Select Columns */}
            <div className="glass-card p-6 space-y-4 bg-white border border-gray-100 shadow-md">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center bg-gray-900 text-white rounded-full text-xs font-semibold">2</span>
                  Select Columns to Analyze
                </h2>
                <button
                  type="button"
                  onClick={handleSelectAllColumns}
                  className="text-xs text-sky-600 hover:underline font-semibold"
                >
                  {selectedColumns.length === currentDataset.columns.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Choose the columns to include in the statistical and machine learning checks. If none are selected, all numerical columns will be evaluated.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1">
                {currentDataset.columns.map((col) => {
                  const isChecked = selectedColumns.includes(col);
                  const isNumeric = currentDataset.column_types[col] === 'numeric';
                  
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => handleToggleColumn(col)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-left text-xs border transition-all ${
                        isChecked 
                          ? 'bg-gray-900 text-white border-gray-900 font-semibold' 
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 shrink-0 text-white" />
                      ) : (
                        <Square className="w-4 h-4 shrink-0 text-gray-450" />
                      )}
                      <span className="truncate font-mono">{col}</span>
                      {isNumeric && (
                        <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded font-bold font-sans ${isChecked ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>#</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 3: Choose Algorithms */}
            <div className="glass-card p-6 space-y-4 bg-white border border-gray-100 shadow-md">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-gray-900 text-white rounded-full text-xs font-semibold">3</span>
                Select Quality Detectors
              </h2>
              <p className="text-xs text-gray-500">
                Enable or disable specific anomaly detection algorithms based on your dataset requirements.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100/50 transition-colors shadow-sm">
                  <input
                    type="checkbox"
                    id="run_statistical"
                    checked={runStatistical}
                    onChange={(e) => setRunStatistical(e.target.checked)}
                    className="mt-1 w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                  />
                  <div>
                    <label htmlFor="run_statistical" className="text-sm font-semibold text-gray-900 block">Statistical Outlier Check</label>
                    <span className="text-[11px] text-gray-500">Flags univariate values outside standard deviations (Z-score) or fence metrics (IQR).</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100/50 transition-colors shadow-sm">
                  <input
                    type="checkbox"
                    id="run_isolation_forest"
                    checked={runIsolationForest}
                    disabled={currentDataset.row_count < 5}
                    onChange={(e) => setRunIsolationForest(e.target.checked)}
                    className="mt-1 w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 disabled:opacity-50"
                  />
                  <div>
                    <label htmlFor="run_isolation_forest" className="text-sm font-semibold text-gray-900 block">
                      Isolation Forest (ML) {currentDataset.row_count < 5 && <span className="text-[10px] text-amber-600">{"(Requires N >= 5)"}</span>}
                    </label>
                    <span className="text-[11px] text-gray-500">Uses random trees isolation to detect multivariate outliers.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100/50 transition-colors shadow-sm">
                  <input
                    type="checkbox"
                    id="run_lof"
                    checked={runLof}
                    disabled={currentDataset.row_count < 5}
                    onChange={(e) => setRunLof(e.target.checked)}
                    className="mt-1 w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 disabled:opacity-50"
                  />
                  <div>
                    <label htmlFor="run_lof" className="text-sm font-semibold text-gray-900 block">
                      Local Outlier Factor (ML) {currentDataset.row_count < 5 && <span className="text-[10px] text-amber-600">{"(Requires N >= 5)"}</span>}
                    </label>
                    <span className="text-[11px] text-gray-500">Compares density gradients against neighbors to find scattered data.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100/50 transition-colors shadow-sm">
                  <input
                    type="checkbox"
                    id="run_missing"
                    checked={runMissingAnalysis}
                    onChange={(e) => setRunMissingAnalysis(e.target.checked)}
                    className="mt-1 w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                  />
                  <div>
                    <label htmlFor="run_missing" className="text-sm font-semibold text-gray-900 block">Completeness & Feasibility</label>
                    <span className="text-[11px] text-gray-500">Analyzes null counts and searches for impossible physiological values.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100/50 transition-colors shadow-sm">
                  <input
                    type="checkbox"
                    id="run_duplicates"
                    checked={runDuplicateCheck}
                    onChange={(e) => setRunDuplicateCheck(e.target.checked)}
                    className="mt-1 w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                  />
                  <div>
                    <label htmlFor="run_duplicates" className="text-sm font-semibold text-gray-900 block">Deduplication Check</label>
                    <span className="text-[11px] text-gray-500">Finds exact duplicates and near-duplicate entries (copy-paste entry errors).</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100/50 transition-colors shadow-sm">
                  <input
                    type="checkbox"
                    id="run_clinical"
                    checked={runClinicalRules}
                    onChange={(e) => setRunClinicalRules(e.target.checked)}
                    className="mt-1 w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                  />
                  <div>
                    <label htmlFor="run_clinical" className="text-sm font-semibold text-gray-900 block">Clinical Ranges & Protocol Rules</label>
                    <span className="text-[11px] text-gray-500">Validates physiological limits and cross-field longitudinal changes.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Fine-tune Parameters */}
            <div className="glass-card p-6 space-y-6 bg-white border border-gray-100 shadow-md">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-gray-900 text-white rounded-full text-xs font-semibold">4</span>
                Parameter Sliders
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contamination */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span className="flex items-center gap-1 font-medium">Contamination Rate <span title="Expected fraction of outliers in the dataset"><HelpCircle className="w-3.5 h-3.5 text-gray-400" /></span></span>
                    <span className="font-mono text-sky-600 font-bold">{(contamination * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.20"
                    step="0.01"
                    value={contamination}
                    onChange={(e) => setContamination(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                {/* Zscore Threshold */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span className="font-medium">Z-score Threshold</span>
                    <span className="font-mono text-sky-600 font-bold">{zscoreThreshold.toFixed(1)} SD</span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="5.0"
                    step="0.1"
                    value={zscoreThreshold}
                    onChange={(e) => setZscoreThreshold(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                {/* IQR Factor */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span className="font-medium">IQR Factor</span>
                    <span className="font-mono text-sky-600 font-bold">{iqrFactor.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.05"
                    value={iqrFactor}
                    onChange={(e) => setIqrFactor(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                {/* Min Anomaly Score */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span className="font-medium">Minimum Reporting Threshold</span>
                    <span className="font-mono text-sky-600 font-bold">{minAnomalyScore.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.90"
                    step="0.05"
                    value={minAnomalyScore}
                    onChange={(e) => setMinAnomalyScore(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>
              </div>

              {/* Data Type */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <label htmlFor="data_type" className="text-sm font-semibold text-gray-700 block">Physiological Profiles Preset</label>
                <div className="flex gap-4">
                  {['auto', 'labs', 'vitals'].map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-600 hover:text-gray-900">
                      <input
                        type="radio"
                        name="data_type"
                        value={type}
                        checked={dataType === type}
                        onChange={(e) => setDataType(e.target.value)}
                        className="w-4 h-4 text-gray-900 bg-white border-gray-300 focus:ring-gray-900"
                      />
                      <span className="capitalize">{type} Preset</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-secondary px-5 py-2.5 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="btn-primary px-6 py-2.5 font-bold shadow-md flex items-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting Analysis...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Execute Detection Pipeline
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
