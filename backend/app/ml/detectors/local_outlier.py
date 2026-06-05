from __future__ import annotations

import logging
import numpy as np
import pandas as pd
from dataclasses import dataclass
from sklearn.neighbors import LocalOutlierFactor

logger = logging.getLogger(__name__)

@dataclass
class LOFAnomaly:
    row_index: int
    anomaly_score: float  # 0-1, higher = more anomalous
    is_anomaly: bool
    raw_score: float

class LOFDetector:
    def __init__(self, contamination: float = 0.05, n_neighbors: int = 20):
        self.contamination = contamination
        self.n_neighbors = n_neighbors
        self.model = LocalOutlierFactor(
            n_neighbors=self.n_neighbors,
            contamination=self.contamination,
            n_jobs=-1
        )

    def detect(self, df: pd.DataFrame, numeric_columns: list[str]) -> list[LOFAnomaly]:
        """Runs Local Outlier Factor anomaly detection on specified numeric columns.
        
        Handles empty/insufficient data gracefully.
        """
        # LOF needs at least n_neighbors + 1 rows, fallback to smaller n_neighbors if needed
        if not numeric_columns or df.empty or len(df) < 5:
            return []

        try:
            X = df[numeric_columns].copy()
            for col in numeric_columns:
                median_val = X[col].median()
                if pd.isna(median_val):
                    median_val = 0.0
                X[col] = X[col].fillna(median_val)

            # Adjust n_neighbors if dataset is too small
            n_samples = len(X)
            adjusted_neighbors = min(self.n_neighbors, n_samples - 1)
            if adjusted_neighbors < 2:
                # LOF cannot run with less than 2 neighbors
                return []

            self.model.n_neighbors = adjusted_neighbors

            # Fit and predict: 1 for inliers, -1 for outliers
            preds = self.model.fit_predict(X)
            
            # negative_outlier_factor_: opposite of LOF of the training samples. 
            # Inliers are close to -1, outliers are much smaller (e.g. -2, -5)
            neg_lof = self.model.negative_outlier_factor_
            lof = -neg_lof  # LOF score, >= 1.0. Inliers ~ 1.0, outliers > 1.5

            # Map LOF score to [0, 1] range.
            # A value of 1.0 maps to 0.0. The maximum LOF maps to 1.0.
            min_lof = lof.min()
            max_lof = lof.max()
            
            anomaly_scores = []
            if max_lof - min_lof > 1e-6:
                anomaly_scores = (lof - min_lof) / (max_lof - min_lof)
            else:
                anomaly_scores = np.zeros_like(lof)

            results: list[LOFAnomaly] = []
            for i, idx in enumerate(df.index):
                is_anom = bool(preds[i] == -1)
                results.append(
                    LOFAnomaly(
                        row_index=int(idx),
                        anomaly_score=float(round(anomaly_scores[i], 4)),
                        is_anomaly=is_anom,
                        raw_score=float(round(lof[i], 4))
                    )
                )
            return results

        except Exception as e:
            logger.error("Error running LOF detector: %s", e, exc_info=True)
            return []
