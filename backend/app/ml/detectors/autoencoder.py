from __future__ import annotations

import logging
import numpy as np
import pandas as pd
from dataclasses import dataclass
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

@dataclass
class AutoencoderAnomaly:
    row_index: int
    anomaly_score: float  # reconstruction error, normalized 0-1
    is_anomaly: bool
    reconstruction_error: float

class AutoencoderDetector:
    def __init__(self, contamination: float = 0.05, hidden_layer_ratio: float = 0.5, random_state: int = 42):
        self.contamination = contamination
        self.hidden_layer_ratio = hidden_layer_ratio
        self.random_state = random_state
        self.scaler = StandardScaler()

    def detect(self, df: pd.DataFrame, numeric_columns: list[str]) -> list[AutoencoderAnomaly]:
        """Runs a MLPRegressor-based autoencoder outlier detection.
        
        Fits the model to reconstruct numeric inputs, computes MSE per row,
        and flags the highest error rows as anomalous.
        """
        if not numeric_columns or df.empty or len(df) < 10:
            return []

        try:
            # 1. Prepare and impute data
            X = df[numeric_columns].copy()
            for col in numeric_columns:
                median_val = X[col].median()
                if pd.isna(median_val):
                    median_val = 0.0
                X[col] = X[col].fillna(median_val)

            # 2. Scale features
            X_scaled = self.scaler.fit_transform(X)
            n_features = X_scaled.shape[1]
            
            # Bottleneck layer size
            bottleneck_size = max(1, int(n_features * self.hidden_layer_ratio))

            # 3. Initialize MLPRegressor as autoencoder (X -> X reconstruction)
            # We set max_iter=150 to keep it relatively fast, and use a small tolerance
            model = MLPRegressor(
                hidden_layer_sizes=(bottleneck_size,),
                activation='relu',
                solver='adam',
                max_iter=150,
                random_state=self.random_state,
                early_stopping=True,
                validation_fraction=0.1
            )

            # Fit model to map scaled input to itself
            model.fit(X_scaled, X_scaled)

            # Reconstruct
            X_reconstructed = model.predict(X_scaled)

            # 4. Compute reconstruction error (MSE per row)
            mse_errors = np.mean((X_scaled - X_reconstructed) ** 2, axis=1)

            # Find the threshold for the top contamination% errors
            sorted_errors = np.sort(mse_errors)
            threshold_idx = int(len(sorted_errors) * (1.0 - self.contamination))
            threshold_idx = min(threshold_idx, len(sorted_errors) - 1)
            error_threshold = sorted_errors[threshold_idx]

            # Normalize errors to [0, 1] range
            min_err = mse_errors.min()
            max_err = mse_errors.max()
            
            anomaly_scores = []
            if max_err - min_err > 1e-6:
                anomaly_scores = (mse_errors - min_err) / (max_err - min_err)
            else:
                anomaly_scores = np.zeros_like(mse_errors)

            results: list[AutoencoderAnomaly] = []
            for i, idx in enumerate(df.index):
                is_anom = bool(mse_errors[i] >= error_threshold)
                results.append(
                    AutoencoderAnomaly(
                        row_index=int(idx),
                        anomaly_score=float(round(anomaly_scores[i], 4)),
                        is_anomaly=is_anom,
                        reconstruction_error=float(round(mse_errors[i], 4))
                    )
                )
            return results

        except Exception as e:
            logger.error("Error running MLP autoencoder detector: %s", e, exc_info=True)
            return []
