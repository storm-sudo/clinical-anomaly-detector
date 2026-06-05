from __future__ import annotations

import logging
import numpy as np
import pandas as pd
from dataclasses import dataclass
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)

@dataclass
class IFAnomaly:
    row_index: int
    anomaly_score: float  # 0-1, higher = more anomalous
    is_anomaly: bool
    raw_score: float

class IsolationForestDetector:
    def __init__(self, contamination: float = 0.05, n_estimators: int = 100, random_state: int = 42):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            random_state=self.random_state,
            n_jobs=-1
        )

    def detect(self, df: pd.DataFrame, numeric_columns: list[str]) -> list[IFAnomaly]:
        """Runs Isolation Forest anomaly detection on the specified numeric columns.
        
        Handles empty/insufficient data gracefully by returning empty results.
        """
        if not numeric_columns or df.empty or len(df) < 5:
            return []

        try:
            # Drop rows with NaN in the selected columns for model fitting/predicting,
            # but we will return indices matching the original dataframe.
            # To keep it simple and preserve row indices, we impute NaNs with column medians.
            X = df[numeric_columns].copy()
            for col in numeric_columns:
                median_val = X[col].median()
                if pd.isna(median_val):
                    # If whole column is NaN, fill with 0
                    median_val = 0.0
                X[col] = X[col].fillna(median_val)

            # Fit model and predict
            self.model.fit(X)
            
            # Predict: 1 for inliers, -1 for outliers
            preds = self.model.predict(X)
            
            # score_samples: opposite of the anomaly score. Lower is more anomalous (values in [-1, 0])
            raw_scores = self.model.score_samples(X)
            
            # Normalise scores to 0-1 where 1 is most anomalous.
            # raw_scores are typically negative. Let's map [-1.0, 0.0] or the actual range to [0.0, 1.0]
            min_raw = raw_scores.min()
            max_raw = raw_scores.max()
            
            anomaly_scores = []
            if max_raw - min_raw > 1e-6:
                # Normalise to 0-1: 1 at min_raw (most anomalous), 0 at max_raw (least anomalous)
                anomaly_scores = (max_raw - raw_scores) / (max_raw - min_raw)
            else:
                # If all scores are identical, map based on raw value
                # e.g., if negative, maybe moderately anomalous
                anomaly_scores = np.ones_like(raw_scores) * 0.1

            results: list[IFAnomaly] = []
            for i, idx in enumerate(df.index):
                is_anom = bool(preds[i] == -1)
                results.append(
                    IFAnomaly(
                        row_index=int(idx),
                        anomaly_score=float(round(anomaly_scores[i], 4)),
                        is_anomaly=is_anom,
                        raw_score=float(round(raw_scores[i], 4))
                    )
                )
            return results

        except Exception as e:
            logger.error("Error running Isolation Forest detector: %s", e, exc_info=True)
            return []
