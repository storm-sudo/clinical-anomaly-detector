from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Any, Optional
import pandas as pd
import numpy as np

from app.ml.preprocessor import ClinicalDataPreprocessor
from app.ml.detectors.statistical import StatisticalDetector
from app.ml.detectors.isolation_forest import IsolationForestDetector
from app.ml.detectors.local_outlier import LOFDetector
from app.ml.detectors.missing_data import MissingDataDetector
from app.ml.detectors.duplicate import DuplicateDetector
from app.ml.detectors.clinical_rules import ClinicalRulesDetector
from app.ml.detectors.autoencoder import AutoencoderDetector
from app.ml.scorer import EnsembleScorer
from app.ml.explainer import ClinicalExplainer

logger = logging.getLogger(__name__)

@dataclass
class PipelineResult:
    total_rows_analyzed: int
    total_anomalies_detected: int
    anomaly_rate_percent: float
    overall_data_quality_score: float
    column_statistics: dict[str, Any]
    algorithm_results: dict[str, Any]
    anomaly_summary: dict[str, Any]
    recommendations: list[str]
    processing_time_seconds: float
    anomalies: list[dict[str, Any]]

class AnomalyDetectionPipeline:
    def __init__(self, config: dict[str, Any]):
        self.config = config
        self.preprocessor = ClinicalDataPreprocessor()
        self.scorer = EnsembleScorer()
        self.explainer = ClinicalExplainer()

    def run(self, df: pd.DataFrame) -> PipelineResult:
        """Executes the complete anomaly detection pipeline on the input DataFrame."""
        start_time = time.time()
        n_rows = len(df)
        
        if df.empty:
            return PipelineResult(
                total_rows_analyzed=0,
                total_anomalies_detected=0,
                anomaly_rate_percent=0.0,
                overall_data_quality_score=100.0,
                column_statistics={},
                algorithm_results={},
                anomaly_summary={"by_severity": {}, "by_column": {}, "by_method": {}},
                recommendations=["Dataset is empty."],
                processing_time_seconds=0.0,
                anomalies=[]
            )

        # 1. Profile and preprocess the data
        col_map = self.preprocessor.detect_column_mapping(df.columns.tolist())
        subject_col = self._find_column_by_concept(col_map, 'subject_id')
        timepoint_col = self._find_column_by_concept(col_map, 'timepoint')
        
        # Select numeric columns for multivariate models
        numeric_cols = self.preprocessor.select_numeric_columns(df)
        if self.config.get('columns_to_analyze'):
            numeric_cols = [c for c in numeric_cols if c in self.config['columns_to_analyze']]

        # Impute missing values for ML algorithms
        df_imputed = self.preprocessor.handle_missing_for_ml(df)

        # 2. Setup parallel detector tasks
        detector_tasks = []
        contamination = self.config.get('contamination', 0.05)
        zscore_thresh = self.config.get('zscore_threshold', 3.0)
        iqr_fact = self.config.get('iqr_factor', 1.5)

        if self.config.get('run_statistical', True):
            stat_det = StatisticalDetector()
            detector_tasks.append((
                'statistical',
                lambda: stat_det.detect_all(df, numeric_cols, threshold=zscore_thresh, factor=iqr_fact)
            ))

        if self.config.get('run_isolation_forest', True) and len(df) >= 5:
            if_det = IsolationForestDetector(contamination=contamination, random_state=42)
            detector_tasks.append((
                'isolation_forest',
                lambda: if_det.detect(df_imputed, numeric_cols)
            ))

        if self.config.get('run_lof', True) and len(df) >= 5:
            lof_det = LOFDetector(contamination=contamination)
            detector_tasks.append((
                'lof',
                lambda: lof_det.detect(df_imputed, numeric_cols)
            ))

        if self.config.get('run_missing_analysis', True):
            miss_det = MissingDataDetector()
            detector_tasks.append((
                'missing_data',
                lambda: miss_det.detect_all(df, subject_col, timepoint_col)
            ))

        if self.config.get('run_duplicate_check', True):
            dup_det = DuplicateDetector()
            detector_tasks.append((
                'duplicates',
                lambda: dup_det.detect_all(df)
            ))

        if self.config.get('run_clinical_rules', True):
            clin_det = ClinicalRulesDetector()
            detector_tasks.append((
                'clinical_rules',
                lambda: clin_det.detect_all(df, subject_col, timepoint_col)
            ))

        # Check for Autoencoder (MLPRegressor bottleneck model)
        # Runs if run_isolation_forest or run_lof is enabled as a bonus multivariate detector
        if self.config.get('run_autoencoder', True) and len(df) >= 10:
            ae_det = AutoencoderDetector(contamination=contamination, random_state=42)
            detector_tasks.append((
                'autoencoder',
                lambda: ae_det.detect(df_imputed, numeric_cols)
            ))

        # Run tasks concurrently in ThreadPoolExecutor
        raw_results = {}
        algorithm_results = {}
        
        with ThreadPoolExecutor(max_workers=min(len(detector_tasks), 7)) as executor:
            future_to_name = {
                executor.submit(task): name for name, task in detector_tasks
            }
            for future in as_completed(future_to_name):
                name = future_to_name[future]
                try:
                    result = future.result()
                    raw_results[name] = result
                    algorithm_results[name] = {
                        "status": "completed",
                        "count": len(result),
                        "error": None
                    }
                except Exception as e:
                    logger.error("Error executing detector %s: %s", name, e, exc_info=True)
                    raw_results[name] = []
                    algorithm_results[name] = {
                        "status": "failed",
                        "count": 0,
                        "error": str(e)
                    }

        # 3. Merge and deduplicate findings to cell-level anomalies
        merged_anomalies = self._merge_anomalies(
            raw_results=raw_results,
            df=df,
            numeric_cols=numeric_cols,
            col_map=col_map,
            subject_col=subject_col
        )

        # 4. Generate column statistics
        col_stats = self.preprocessor.generate_data_profile(df)

        # 5. Build summary metrics
        summary = self._build_summary(merged_anomalies)

        # 6. Calculate data quality score
        crit_count = summary['by_severity'].get('CRITICAL', 0)
        high_count = summary['by_severity'].get('HIGH', 0)
        quality_score = self.scorer.calculate_data_quality_score(
            total_rows=n_rows,
            anomaly_count=len(merged_anomalies),
            critical_count=crit_count,
            high_count=high_count
        )

        # 7. Generate actionable recommendations
        recs = self.scorer.generate_recommendations(summary, col_stats)

        processing_time = time.time() - start_time

        return PipelineResult(
            total_rows_analyzed=n_rows,
            total_anomalies_detected=len(merged_anomalies),
            anomaly_rate_percent=round((len(merged_anomalies) / n_rows) * 100, 2) if n_rows > 0 else 0.0,
            overall_data_quality_score=quality_score,
            column_statistics=col_stats,
            algorithm_results=algorithm_results,
            anomaly_summary=summary,
            recommendations=recs,
            processing_time_seconds=round(processing_time, 4),
            anomalies=merged_anomalies
        )

    def _find_column_by_concept(self, col_map: dict[str, str], concept: str) -> Optional[str]:
        """Returns the first column name that maps to the specified clinical concept."""
        for col, con in col_map.items():
            if con == concept:
                return col
        return None

    def _merge_anomalies(
        self,
        raw_results: dict[str, Any],
        df: pd.DataFrame,
        numeric_cols: list[str],
        col_map: dict[str, str],
        subject_col: Optional[str]
    ) -> list[dict[str, Any]]:
        """Combines row-level and cell-level anomalies into a single cell-level anomaly list."""
        
        # Grid of cell scores: (row_index, column_name) -> dict[algo_name, score]
        grid: dict[tuple[int, str], dict[str, float]] = {}
        # Keep track of expected ranges and intermediate stats per column
        ranges: dict[str, tuple[Optional[float], Optional[float]]] = {}
        z_scores: dict[tuple[int, str], float] = {}
        
        # Map to track details from specific rule checkers
        types_map: dict[tuple[int, str], str] = {}
        sigs_map: dict[tuple[int, str], str] = {}
        actions_map: dict[tuple[int, str], str] = {}

        # ── 1. Process Cell-Level Algorithms ──
        
        # A. Statistical Detector
        for anom in raw_results.get('statistical', []):
            k = (anom.row_index, anom.column_name)
            if k not in grid:
                grid[k] = {}
            grid[k]['statistical'] = anom.anomaly_score
            z_scores[k] = anom.z_score
            ranges[anom.column_name] = (anom.expected_min, anom.expected_max)
            types_map[k] = "statistical_outlier"

        # B. Clinical Rules Detector
        for anom in raw_results.get('clinical_rules', []):
            k = (anom.row_index, anom.column_name)
            if k not in grid:
                grid[k] = {}
            grid[k]['clinical_rules'] = anom.anomaly_score
            ranges[anom.column_name] = (anom.expected_min, anom.expected_max)
            types_map[k] = anom.anomaly_type
            sigs_map[k] = anom.clinical_significance

        # C. Missing Data Detector
        for anom in raw_results.get('missing_data', []):
            if anom.row_index is None:
                # Column-level missing rate: we attribute it to row 0 or handle it
                # For DB insertion, let's create a cell-level anomaly for each missing value,
                # or just record it at row_index=0 for that column.
                k = (0, anom.column_name)
            else:
                k = (anom.row_index, anom.column_name)
                
            if k not in grid:
                grid[k] = {}
            grid[k]['missing_data'] = anom.anomaly_score
            types_map[k] = anom.anomaly_type
            sigs_map[k] = anom.description

        # ── 2. Process Row-Level/Multivariate Algorithms ──
        
        # Helper to attribute row-level score to all numeric columns in that row
        def attribute_row_score(algo_name: str, row_index: int, score: float):
            for col in numeric_cols:
                k = (row_index, col)
                if k not in grid:
                    grid[k] = {}
                grid[k][algo_name] = score

        # A. Isolation Forest
        for anom in raw_results.get('isolation_forest', []):
            if anom.is_anomaly:
                attribute_row_score('isolation_forest', anom.row_index, anom.anomaly_score)

        # B. Local Outlier Factor (LOF)
        for anom in raw_results.get('lof', []):
            if anom.is_anomaly:
                attribute_row_score('lof', anom.row_index, anom.anomaly_score)

        # C. Autoencoder
        for anom in raw_results.get('autoencoder', []):
            if anom.is_anomaly:
                attribute_row_score('autoencoder', anom.row_index, anom.anomaly_score)

        # D. Duplicates
        for anom in raw_results.get('duplicates', []):
            # Attribute duplicate score to the columns that matched
            cols_to_attribute = anom.columns_matching if anom.columns_matching else numeric_cols
            for col in cols_to_attribute:
                k = (anom.row_index, col)
                if k not in grid:
                    grid[k] = {}
                grid[k]['duplicates'] = anom.anomaly_score
                types_map[k] = anom.anomaly_type
                sigs_map[k] = f"Row is a duplicate of row {anom.duplicate_of_row}."

        # ── 3. Compile and Score ──
        min_score = self.config.get('min_anomaly_score', 0.3)
        final_anomalies = []

        for (r_idx, col_name), scores in grid.items():
            # Combine the scores using EnsembleScorer
            combined_score = self.scorer.combine_scores(scores)
            
            if combined_score >= min_score:
                # Retrieve actual cell value
                try:
                    raw_val = df.loc[r_idx, col_name]
                    val_str = str(raw_val) if not pd.isna(raw_val) else "NaN"
                    val_float = float(raw_val) if (not pd.isna(raw_val) and isinstance(raw_val, (int, float, np.number))) else None
                except Exception:
                    val_str = "N/A"
                    val_float = None

                # Expected ranges
                exp_min, exp_max = ranges.get(col_name, (None, None))
                z_sc = z_scores.get((r_idx, col_name))

                # Subject ID
                subj_id = None
                if subject_col and subject_col in df.columns:
                    subj_id = str(df.loc[r_idx, subject_col])

                # Severity
                severity = self.scorer.assign_severity(combined_score)

                # Type
                anom_type = types_map.get((r_idx, col_name), "multivariate_outlier")

                # Explanation & Suggested Action
                methods = list(scores.keys())
                
                # Check if we have specific clinical rules description
                clin_sig = sigs_map.get((r_idx, col_name))
                if not clin_sig:
                    # Generate general explanation
                    if val_float is not None:
                        clin_sig = self.scorer.generate_explanation(
                            column=col_name,
                            value=val_float,
                            z_score=z_sc,
                            score=combined_score,
                            methods=methods,
                            expected_min=exp_min,
                            expected_max=exp_max
                        )
                    else:
                        clin_sig = f"Value '{val_str}' in column '{col_name}' flagged by {len(methods)} methods."

                # Explain clinical significance and suggested action
                canonical_col = col_map.get(col_name)
                
                # If we don't have a specific explanation, use the ClinicalExplainer
                if val_float is not None:
                    sig_exp, sug_act = self.explainer.explain_anomaly(
                        column=col_name,
                        value=val_float,
                        z_score=z_sc,
                        expected_min=exp_min if exp_min is not None else 0.0,
                        expected_max=exp_max if exp_max is not None else 0.0,
                        methods=methods,
                        severity=severity,
                        canonical_column=canonical_col
                    )
                    # Use rules-based explanation if available, but overlay suggested action
                    if not sigs_map.get((r_idx, col_name)):
                        clin_sig = sig_exp
                    action = sug_act
                else:
                    action = self.explainer.get_suggested_action(severity, anom_type)

                final_anomalies.append({
                    "row_index": r_idx,
                    "column_name": col_name,
                    "subject_id": subj_id,
                    "value": val_str,
                    "expected_range_min": float(exp_min) if exp_min is not None else None,
                    "expected_range_max": float(exp_max) if exp_max is not None else None,
                    "z_score": float(z_sc) if z_sc is not None else None,
                    "anomaly_score": float(round(combined_score, 4)),
                    "severity": severity,
                    "detection_method": ", ".join(methods),
                    "anomaly_type": anom_type,
                    "clinical_significance": clin_sig,
                    "suggested_action": action
                })

        # Sort anomalies by row_index, then by column_name
        final_anomalies.sort(key=lambda x: (x['row_index'], x['column_name']))
        return final_anomalies

    def _build_summary(self, anomalies: list[dict[str, Any]]) -> dict[str, Any]:
        """Aggregates anomalies by severity, column name, and detection method."""
        by_severity = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        by_column = {}
        by_method = {}

        for anom in anomalies:
            # 1. Severity count
            sev = anom['severity']
            by_severity[sev] = by_severity.get(sev, 0) + 1

            # 2. Column count
            col = anom['column_name']
            by_column[col] = by_column.get(col, 0) + 1

            # 3. Method counts
            methods = [m.strip() for m in anom['detection_method'].split(',')]
            for m in methods:
                by_method[m] = by_method.get(m, 0) + 1

        # Sort by_column descending
        sorted_column = dict(sorted(by_column.items(), key=lambda x: x[1], reverse=True))

        return {
            "total": len(anomalies),
            "by_severity": by_severity,
            "by_column": sorted_column,
            "by_method": by_method
        }
