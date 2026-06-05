from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import pandas as pd
from scipy import stats as scipy_stats

logger = logging.getLogger(__name__)


@dataclass
class StatisticalAnomaly:
    row_index: int
    column_name: str
    value: float
    z_score: Optional[float]
    anomaly_score: float          # 0-1, higher = more anomalous
    detection_method: str
    expected_min: Optional[float]
    expected_max: Optional[float]
    is_anomaly: bool


class StatisticalDetector:
    """Collection of univariate statistical outlier detection methods."""

    def detect_zscore(
        self,
        series: pd.Series,
        threshold: float = 3.0,
    ) -> list[StatisticalAnomaly]:
        """Flag values with |z-score| > threshold."""
        clean = series.dropna()
        if len(clean) < 4:
            return []

        mean = float(clean.mean())
        std = float(clean.std())
        if std == 0 or math.isnan(std):
            return []

        col_name = str(series.name) if series.name is not None else "unknown"
        results: list[StatisticalAnomaly] = []

        for idx, raw_val in series.items():
            if pd.isna(raw_val):
                continue
            val = float(raw_val)
            z = (val - mean) / std
            is_anom = abs(z) > threshold
            score = min(abs(z) / (threshold * 2), 1.0)

            results.append(
                StatisticalAnomaly(
                    row_index=int(idx),
                    column_name=col_name,
                    value=val,
                    z_score=round(z, 4),
                    anomaly_score=round(score, 4),
                    detection_method="zscore",
                    expected_min=round(mean - threshold * std, 4),
                    expected_max=round(mean + threshold * std, 4),
                    is_anomaly=is_anom,
                )
            )
        return [a for a in results if a.is_anomaly]

    def detect_iqr(
        self,
        series: pd.Series,
        factor: float = 1.5,
    ) -> list[StatisticalAnomaly]:
        """Flag values outside [Q1 - factor*IQR, Q3 + factor*IQR]."""
        clean = series.dropna()
        if len(clean) < 4:
            return []

        q1 = float(clean.quantile(0.25))
        q3 = float(clean.quantile(0.75))
        iqr = q3 - q1
        if iqr == 0:
            return []

        lower_fence = q1 - factor * iqr
        upper_fence = q3 + factor * iqr
        col_name = str(series.name) if series.name is not None else "unknown"
        results: list[StatisticalAnomaly] = []

        for idx, raw_val in series.items():
            if pd.isna(raw_val):
                continue
            val = float(raw_val)
            if val < lower_fence:
                dist = (lower_fence - val) / (iqr if iqr > 0 else 1)
                score = min(dist / (factor * 2), 1.0)
                is_anom = True
            elif val > upper_fence:
                dist = (val - upper_fence) / (iqr if iqr > 0 else 1)
                score = min(dist / (factor * 2), 1.0)
                is_anom = True
            else:
                continue

            results.append(
                StatisticalAnomaly(
                    row_index=int(idx),
                    column_name=col_name,
                    value=val,
                    z_score=None,
                    anomaly_score=round(score, 4),
                    detection_method="iqr",
                    expected_min=round(lower_fence, 4),
                    expected_max=round(upper_fence, 4),
                    is_anomaly=is_anom,
                )
            )
        return results

    def detect_modified_zscore(
        self,
        series: pd.Series,
        threshold: float = 3.5,
    ) -> list[StatisticalAnomaly]:
        """Median Absolute Deviation (MAD) based outlier detection.
        
        More robust than z-score for non-normal distributions.
        Modified z = 0.6745 * (xi - median) / MAD
        """
        clean = series.dropna()
        if len(clean) < 4:
            return []

        median = float(clean.median())
        mad = float(np.median(np.abs(clean - median)))
        if mad == 0:
            # Fall back to std
            mad_proxy = float(clean.std()) * 0.6745
            if mad_proxy == 0:
                return []
            mad = mad_proxy / 0.6745

        col_name = str(series.name) if series.name is not None else "unknown"
        results: list[StatisticalAnomaly] = []

        for idx, raw_val in series.items():
            if pd.isna(raw_val):
                continue
            val = float(raw_val)
            mod_z = 0.6745 * (val - median) / mad
            is_anom = abs(mod_z) > threshold
            if not is_anom:
                continue
            score = min(abs(mod_z) / (threshold * 2), 1.0)

            results.append(
                StatisticalAnomaly(
                    row_index=int(idx),
                    column_name=col_name,
                    value=val,
                    z_score=round(mod_z, 4),
                    anomaly_score=round(score, 4),
                    detection_method="modified_zscore",
                    expected_min=None,
                    expected_max=None,
                    is_anomaly=True,
                )
            )
        return results

    def detect_grubbs(
        self,
        series: pd.Series,
        alpha: float = 0.05,
    ) -> list[StatisticalAnomaly]:
        """Grubbs test: flag the single most extreme value if it exceeds the critical value."""
        clean = series.dropna()
        n = len(clean)
        if n < 6:
            return []

        mean = float(clean.mean())
        std = float(clean.std())
        if std == 0:
            return []

        col_name = str(series.name) if series.name is not None else "unknown"

        # Grubbs statistic: G = max|xi - mean| / std
        abs_devs = np.abs(clean - mean)
        max_dev_idx = abs_devs.idxmax()
        g_stat = float(abs_devs.max()) / std

        # Critical value from t-distribution
        t_crit_sq = scipy_stats.t.ppf(1 - alpha / (2 * n), df=n - 2) ** 2
        g_crit = ((n - 1) / math.sqrt(n)) * math.sqrt(t_crit_sq / (n - 2 + t_crit_sq))

        if g_stat <= g_crit:
            return []

        val = float(series.loc[max_dev_idx])
        score = min(g_stat / (g_crit * 2), 1.0)

        return [
            StatisticalAnomaly(
                row_index=int(max_dev_idx),
                column_name=col_name,
                value=val,
                z_score=round(g_stat, 4),
                anomaly_score=round(score, 4),
                detection_method="grubbs",
                expected_min=round(mean - g_crit * std, 4),
                expected_max=round(mean + g_crit * std, 4),
                is_anomaly=True,
            )
        ]

    def detect_percentile_bounds(
        self,
        series: pd.Series,
        lower: float = 1.0,
        upper: float = 99.0,
    ) -> list[StatisticalAnomaly]:
        """Flag values below the lower percentile or above the upper percentile."""
        clean = series.dropna()
        if len(clean) < 20:
            return []

        lower_bound = float(np.percentile(clean, lower))
        upper_bound = float(np.percentile(clean, upper))
        col_name = str(series.name) if series.name is not None else "unknown"
        results: list[StatisticalAnomaly] = []

        for idx, raw_val in series.items():
            if pd.isna(raw_val):
                continue
            val = float(raw_val)
            if val < lower_bound or val > upper_bound:
                # Score proportional to distance beyond bound
                rng = upper_bound - lower_bound if upper_bound != lower_bound else 1.0
                if val < lower_bound:
                    score = min((lower_bound - val) / rng, 1.0)
                else:
                    score = min((val - upper_bound) / rng, 1.0)

                results.append(
                    StatisticalAnomaly(
                        row_index=int(idx),
                        column_name=col_name,
                        value=val,
                        z_score=None,
                        anomaly_score=round(score, 4),
                        detection_method="percentile_bounds",
                        expected_min=round(lower_bound, 4),
                        expected_max=round(upper_bound, 4),
                        is_anomaly=True,
                    )
                )
        return results

    def detect_all(
        self,
        df: pd.DataFrame,
        numeric_columns: list[str],
        threshold: float = 3.0,
        factor: float = 1.5,
    ) -> list[StatisticalAnomaly]:
        """Run all methods on each numeric column.

        Deduplicate by (row_index, column_name), keeping the highest anomaly_score.
        """
        # Key: (row_index, column_name) → best StatisticalAnomaly
        best: dict[tuple[int, str], StatisticalAnomaly] = {}

        for col in numeric_columns:
            if col not in df.columns:
                continue
            series = df[col]

            all_col_anomalies: list[StatisticalAnomaly] = []
            try:
                all_col_anomalies += self.detect_zscore(series, threshold)
            except Exception as exc:
                logger.debug("zscore failed on %s: %s", col, exc)
            try:
                all_col_anomalies += self.detect_iqr(series, factor)
            except Exception as exc:
                logger.debug("iqr failed on %s: %s", col, exc)
            try:
                all_col_anomalies += self.detect_modified_zscore(series)
            except Exception as exc:
                logger.debug("modified_zscore failed on %s: %s", col, exc)
            try:
                all_col_anomalies += self.detect_grubbs(series)
            except Exception as exc:
                logger.debug("grubbs failed on %s: %s", col, exc)
            try:
                all_col_anomalies += self.detect_percentile_bounds(series)
            except Exception as exc:
                logger.debug("percentile_bounds failed on %s: %s", col, exc)

            for a in all_col_anomalies:
                key = (a.row_index, a.column_name)
                if key not in best or a.anomaly_score > best[key].anomaly_score:
                    best[key] = a

        return list(best.values())
