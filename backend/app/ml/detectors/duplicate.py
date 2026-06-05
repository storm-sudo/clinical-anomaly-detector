from __future__ import annotations

import logging
from dataclasses import dataclass
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

@dataclass
class DuplicateAnomaly:
    row_index: int
    duplicate_of_row: int
    columns_matching: list[str]
    anomaly_score: float
    anomaly_type: str  # 'exact_duplicate', 'near_duplicate'

class DuplicateDetector:
    def detect_exact_duplicates(self, df: pd.DataFrame) -> list[DuplicateAnomaly]:
        """Detects rows that are exact duplicates of another row."""
        results: list[DuplicateAnomaly] = []
        if df.empty or len(df) < 2:
            return results

        try:
            # Find all duplicated rows (keep=False marks all duplicates as True)
            dupes_mask = df.duplicated(keep=False)
            if not dupes_mask.any():
                return results

            # To find the original occurrence for each duplicate:
            # We can hash the rows or group by all columns
            grouped = df.groupby(list(df.columns), as_index=False)
            
            for name, group in grouped:
                if len(group) > 1:
                    indices = list(group.index)
                    original = indices[0]
                    # The rest are duplicates
                    for duplicate_idx in indices[1:]:
                        results.append(
                            DuplicateAnomaly(
                                row_index=int(duplicate_idx),
                                duplicate_of_row=int(original),
                                columns_matching=list(df.columns),
                                anomaly_score=1.0,  # Exact duplicate is high confidence anomaly
                                anomaly_type="exact_duplicate"
                            )
                        )
            return results
        except Exception as e:
            logger.error("Error detecting exact duplicates: %s", e, exc_info=True)
            return results

    def detect_near_duplicates(self, df: pd.DataFrame, threshold: float = 0.95, tolerance: float = 0.01) -> list[DuplicateAnomaly]:
        """Detects rows where a high fraction (threshold) of numeric values match within a tolerance (e.g. 1%)."""
        results: list[DuplicateAnomaly] = []
        n_samples = len(df)
        if n_samples < 2:
            return results

        try:
            # Select numeric columns
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            if not numeric_cols:
                return results

            # Impute NaNs with median just for near-duplicate comparison
            X = df[numeric_cols].copy()
            for col in numeric_cols:
                median_val = X[col].median()
                if pd.isna(median_val):
                    median_val = 0.0
                X[col] = X[col].fillna(median_val)

            # Convert to numpy array
            data = X.values
            
            # To avoid slow O(N^2) comparison for very large datasets,
            # we limit pairwise comparison to first 1000 rows.
            # In a clinical trial dataset, this is usually sufficient.
            limit = min(n_samples, 1000)
            
            # Track duplicates we already found to avoid reporting reciprocal duplicates twice
            already_flagged = set()

            for i in range(limit):
                for j in range(i + 1, limit):
                    row_i = data[i]
                    row_j = data[j]

                    # Check which values match within tolerance
                    # For absolute differences, compare to tolerance * value
                    # Handling division by zero by using a small epsilon
                    denom = np.maximum(np.abs(row_i), 1e-5)
                    diff_pct = np.abs(row_i - row_j) / denom
                    
                    matches = diff_pct <= tolerance
                    match_fraction = np.mean(matches)

                    if match_fraction >= threshold:
                        # Find the columns that matched
                        matching_columns = [
                            numeric_cols[k] for k in range(len(numeric_cols)) if matches[k]
                        ]
                        
                        # Determine which is the duplicate (let's say the later row)
                        dup_idx = int(df.index[j])
                        orig_idx = int(df.index[i])
                        
                        if dup_idx not in already_flagged:
                            already_flagged.add(dup_idx)
                            results.append(
                                DuplicateAnomaly(
                                    row_index=dup_idx,
                                    duplicate_of_row=orig_idx,
                                    columns_matching=matching_columns,
                                    anomaly_score=float(round(match_fraction, 4)),
                                    anomaly_type="near_duplicate"
                                )
                            )
            return results

        except Exception as e:
            logger.error("Error detecting near duplicates: %s", e, exc_info=True)
            return results

    def detect_all(self, df: pd.DataFrame) -> list[DuplicateAnomaly]:
        """Runs both exact and near duplicate checks and returns deduplicated results."""
        exact = self.detect_exact_duplicates(df)
        near = self.detect_near_duplicates(df)
        
        # Deduplicate: if a row index is already marked as an exact duplicate,
        # don't report it as a near duplicate.
        seen_indices = {a.row_index for a in exact}
        
        combined = list(exact)
        for a in near:
            if a.row_index not in seen_indices:
                combined.append(a)
                seen_indices.add(a.row_index)
                
        return combined
