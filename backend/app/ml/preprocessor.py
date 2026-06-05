from __future__ import annotations

import io
import logging
import math
from typing import Optional

import numpy as np
import pandas as pd
from rapidfuzz import process, fuzz

logger = logging.getLogger(__name__)

# ── Canonical → aliases mapping ────────────────────────────────────────────────
CLINICAL_COLUMN_ALIASES: dict[str, list[str]] = {
    "hemoglobin": ["hgb", "hb", "haemoglobin", "hemoglobin_value", "hem"],
    "wbc": ["white_blood_cell", "leukocytes", "wbc_count"],
    "platelets": ["plt", "platelet_count", "thrombocytes"],
    "sodium": ["na", "na+", "serum_sodium"],
    "potassium": ["k", "k+", "serum_potassium"],
    "creatinine": ["cr", "crea", "serum_creatinine", "creat"],
    "glucose": ["gluc", "blood_glucose", "fasting_glucose"],
    "alt": ["sgpt", "alanine_aminotransferase"],
    "ast": ["sgot", "aspartate_aminotransferase"],
    "bilirubin": ["bili", "total_bilirubin", "tbili"],
    "systolic_bp": ["sbp", "systolic", "sys_bp", "bp_systolic"],
    "diastolic_bp": ["dbp", "diastolic", "dia_bp", "bp_diastolic"],
    "heart_rate": ["hr", "pulse", "pulse_rate"],
    "temperature": ["temp", "temp_c", "temp_f", "body_temp"],
    "weight": ["wt", "body_weight", "weight_kg"],
    "subject_id": [
        "subject", "subj_id", "patient_id", "patientid",
        "subject_no", "pt_id", "participant_id",
    ],
    "timepoint": ["visit", "visit_no", "timepoint", "week", "day", "study_day"],
}

# Build flat lookup: alias → canonical
_ALIAS_TO_CANONICAL: dict[str, str] = {}
for _canonical, _aliases in CLINICAL_COLUMN_ALIASES.items():
    _ALIAS_TO_CANONICAL[_canonical] = _canonical
    for _alias in _aliases:
        _ALIAS_TO_CANONICAL[_alias] = _canonical

_ENCODINGS = ["utf-8", "latin-1", "cp1252", "utf-8-sig"]
_DELIMITERS = [",", "\t", ";", "|"]


class ClinicalDataPreprocessor:
    """Handles CSV parsing, profiling, column mapping, and ML preprocessing."""

    def parse_and_validate(self, content: bytes) -> tuple[pd.DataFrame, dict]:
        """Parse CSV bytes trying multiple encodings/delimiters.

        Returns (DataFrame, metadata_dict).
        """
        last_exc: Exception = RuntimeError("No valid encoding/delimiter found")
        for encoding in _ENCODINGS:
            for delimiter in _DELIMITERS:
                try:
                    df = pd.read_csv(
                        io.BytesIO(content),
                        sep=delimiter,
                        encoding=encoding,
                        low_memory=False,
                        on_bad_lines="skip",
                    )
                    if df.empty or df.shape[1] < 2:
                        continue
                    df.columns = [str(c).strip() for c in df.columns]
                    metadata = {
                        "encoding": encoding,
                        "delimiter": delimiter,
                        "rows": len(df),
                        "columns": len(df.columns),
                    }
                    return df, metadata
                except Exception as exc:
                    last_exc = exc
        raise ValueError(f"Cannot parse CSV: {last_exc}") from last_exc

    def generate_data_profile(self, df: pd.DataFrame) -> dict:
        """Return per-column statistics for numeric and categorical columns."""
        profile: dict[str, dict] = {}
        total_rows = len(df)

        for col in df.columns:
            col_data = df[col]
            missing_count = int(col_data.isna().sum())
            missing_pct = (missing_count / total_rows * 100) if total_rows > 0 else 0.0
            unique_count = int(col_data.nunique(dropna=True))

            stats: dict = {
                "dtype": str(col_data.dtype),
                "count": total_rows - missing_count,
                "missing_count": missing_count,
                "missing_percent": round(missing_pct, 2),
                "unique_count": unique_count,
            }

            if pd.api.types.is_numeric_dtype(col_data):
                numeric_vals = col_data.dropna()
                if len(numeric_vals) > 0:
                    stats["mean"] = self._safe_float(numeric_vals.mean())
                    stats["median"] = self._safe_float(numeric_vals.median())
                    stats["std"] = self._safe_float(numeric_vals.std())
                    stats["min"] = self._safe_float(numeric_vals.min())
                    stats["max"] = self._safe_float(numeric_vals.max())
                    stats["q25"] = self._safe_float(numeric_vals.quantile(0.25))
                    stats["q75"] = self._safe_float(numeric_vals.quantile(0.75))
                    if len(numeric_vals) > 3:
                        from scipy import stats as scipy_stats
                        stats["skewness"] = self._safe_float(scipy_stats.skew(numeric_vals))
                        stats["kurtosis"] = self._safe_float(scipy_stats.kurtosis(numeric_vals))

            profile[col] = stats

        return profile

    def select_numeric_columns(self, df: pd.DataFrame) -> list[str]:
        """Return names of all numeric columns."""
        return df.select_dtypes(include=[np.number]).columns.tolist()

    def handle_missing_for_ml(self, df: pd.DataFrame) -> pd.DataFrame:
        """Return a copy of df with missing values imputed.

        Numeric columns: median imputation.
        Categorical/other: mode imputation.
        Does NOT modify the original DataFrame.
        """
        df_copy = df.copy()
        for col in df_copy.columns:
            if df_copy[col].isna().any():
                if pd.api.types.is_numeric_dtype(df_copy[col]):
                    median_val = df_copy[col].median()
                    df_copy[col] = df_copy[col].fillna(median_val if not math.isnan(float(median_val)) else 0)
                else:
                    mode_result = df_copy[col].mode()
                    mode_val = mode_result.iloc[0] if len(mode_result) > 0 else ""
                    df_copy[col] = df_copy[col].fillna(mode_val)
        return df_copy

    def detect_column_mapping(self, columns: list[str]) -> dict[str, str]:
        """Use rapidfuzz fuzzy matching to map column names to canonical clinical names.

        Returns {original_col: canonical_name} only for matched columns (score > 70).
        """
        all_canonical_keys = list(CLINICAL_COLUMN_ALIASES.keys())
        all_aliases: list[str] = list(_ALIAS_TO_CANONICAL.keys())

        mapping: dict[str, str] = {}
        for col in columns:
            col_lower = col.lower().strip()
            # Exact match first
            if col_lower in _ALIAS_TO_CANONICAL:
                mapping[col] = _ALIAS_TO_CANONICAL[col_lower]
                continue

            # Fuzzy match against all known aliases
            match = process.extractOne(
                col_lower,
                all_aliases,
                scorer=fuzz.token_set_ratio,
                score_cutoff=70,
            )
            if match:
                matched_alias, score, _ = match
                canonical = _ALIAS_TO_CANONICAL[matched_alias]
                mapping[col] = canonical
                logger.debug(
                    "Column '%s' fuzzy-matched to '%s' (canonical='%s', score=%d)",
                    col, matched_alias, canonical, score,
                )

        return mapping

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _safe_float(v) -> Optional[float]:
        try:
            f = float(v)
            if math.isnan(f) or math.isinf(f):
                return None
            return round(f, 6)
        except Exception:
            return None
