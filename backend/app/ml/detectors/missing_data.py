from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional
import pandas as pd

logger = logging.getLogger(__name__)

@dataclass
class MissingAnomaly:
    row_index: Optional[int]  # None for column-level issues
    column_name: str
    anomaly_type: str         # 'missing_value', 'high_missing_rate', 'impossible_value'
    severity: str             # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    anomaly_score: float      # 0-1 range
    description: str

class MissingDataDetector:
    def __init__(self):
        # Clinical column patterns that should never be negative or zero
        self.always_positive_patterns = {
            'age': ['age', 'years_old'],
            'weight': ['weight', 'wt', 'weight_kg', 'body_weight'],
            'height': ['height', 'ht', 'height_cm'],
            'heart_rate': ['heart_rate', 'hr', 'pulse', 'pulse_rate', 'bpm'],
            'bp': ['bp', 'blood_pressure', 'systolic', 'diastolic', 'sbp', 'dbp'],
            'temp': ['temp', 'temperature', 'temp_c', 'temp_f', 'body_temp'],
            'dose': ['dose', 'dosage', 'amount_mg']
        }

    def detect_missing_values(self, df: pd.DataFrame) -> list[MissingAnomaly]:
        """Detects individual missing values (row-level) and high missing rates (column-level)."""
        results: list[MissingAnomaly] = []
        n_rows = len(df)
        if n_rows == 0:
            return results

        # 1. Column-level missing rate analysis
        for col in df.columns:
            missing_count = int(df[col].isna().sum())
            missing_rate = missing_count / n_rows

            if missing_rate > 0.20:
                results.append(
                    MissingAnomaly(
                        row_index=None,
                        column_name=col,
                        anomaly_type="high_missing_rate",
                        severity="CRITICAL",
                        anomaly_score=round(missing_rate, 4),
                        description=f"Column '{col}' has a critical missing data rate of {missing_rate * 100:.1f}% ({missing_count}/{n_rows} rows missing)."
                    )
                )
            elif missing_rate > 0.05:
                results.append(
                    MissingAnomaly(
                        row_index=None,
                        column_name=col,
                        anomaly_type="high_missing_rate",
                        severity="HIGH",
                        anomaly_score=round(missing_rate, 4),
                        description=f"Column '{col}' has a high missing data rate of {missing_rate * 100:.1f}% ({missing_count}/{n_rows} rows missing)."
                    )
                )

            # 2. Row-level individual missing values
            # For important clinical columns, individual missing values are anomalies.
            # We flag individual missing values in all columns, but assign severity based on importance.
            # Let's check if the column name matches any of our patterns to make it MEDIUM severity, else LOW.
            is_critical_col = any(
                any(pat in col.lower() for pat in pats)
                for pats in self.always_positive_patterns.values()
            )
            
            for idx, val in df[col].items():
                if pd.isna(val):
                    severity = "MEDIUM" if is_critical_col else "LOW"
                    score = 0.5 if is_critical_col else 0.2
                    results.append(
                        MissingAnomaly(
                            row_index=int(idx),
                            column_name=col,
                            anomaly_type="missing_value",
                            severity=severity,
                            anomaly_score=score,
                            description=f"Missing value in clinical parameter '{col}'."
                        )
                    )

        return results

    def detect_impossible_values(self, df: pd.DataFrame) -> list[MissingAnomaly]:
        """Detects impossible clinical values like negative age, weight, or zero blood pressure/temp."""
        results: list[MissingAnomaly] = []

        for col in df.columns:
            # We only inspect numeric columns for impossible values
            if not pd.api.types.is_numeric_dtype(df[col].dtype):
                continue

            col_lower = col.lower()
            
            # Check against patterns
            is_age = any(pat in col_lower for pat in self.always_positive_patterns['age'])
            is_weight = any(pat in col_lower for pat in self.always_positive_patterns['weight'])
            is_height = any(pat in col_lower for pat in self.always_positive_patterns['height'])
            is_hr = any(pat in col_lower for pat in self.always_positive_patterns['heart_rate'])
            is_bp = any(pat in col_lower for pat in self.always_positive_patterns['bp'])
            is_temp = any(pat in col_lower for pat in self.always_positive_patterns['temp'])
            is_dose = any(pat in col_lower for pat in self.always_positive_patterns['dose'])

            for idx, raw_val in df[col].items():
                if pd.isna(raw_val):
                    continue
                val = float(raw_val)

                # General negative value check (most physiological clinical values cannot be negative)
                if val < 0 and (is_age or is_weight or is_height or is_hr or is_bp or is_temp or is_dose):
                    results.append(
                        MissingAnomaly(
                            row_index=int(idx),
                            column_name=col,
                            anomaly_type="impossible_value",
                            severity="CRITICAL",
                            anomaly_score=1.0,
                            description=f"Impossible negative value {val} detected in clinical parameter '{col}'."
                        )
                    )
                    continue

                # Zero check for parameters that must be positive
                if val == 0 and (is_weight or is_height or is_hr or is_bp or is_temp):
                    results.append(
                        MissingAnomaly(
                            row_index=int(idx),
                            column_name=col,
                            anomaly_type="impossible_value",
                            severity="CRITICAL",
                            anomaly_score=0.9,
                            description=f"Impossible zero value detected in clinical parameter '{col}'."
                        )
                    )
                    continue

                # Physiological limits checks (extreme range violations)
                if is_age and (val > 120 or val < 0):
                    results.append(
                        MissingAnomaly(
                            row_index=int(idx),
                            column_name=col,
                            anomaly_type="impossible_value",
                            severity="HIGH",
                            anomaly_score=0.8,
                            description=f"Out-of-bounds subject age: {val} years."
                        )
                    )
                elif is_temp:
                    # In Celsius
                    if (val > 45 or val < 25) and (val < 77 or val > 113):  # Check Celsius and Fahrenheit ranges
                        results.append(
                            MissingAnomaly(
                                row_index=int(idx),
                                column_name=col,
                                anomaly_type="impossible_value",
                                severity="CRITICAL",
                                anomaly_score=1.0,
                                description=f"Physiologically impossible temperature value: {val}."
                            )
                        )

        return results

    def detect_all(self, df: pd.DataFrame, subject_col: str = None, timepoint_col: str = None) -> list[MissingAnomaly]:
        """Runs all missing value and impossible value detection checks."""
        anomalies = []
        anomalies.extend(self.detect_missing_values(df))
        anomalies.extend(self.detect_impossible_values(df))
        return anomalies
