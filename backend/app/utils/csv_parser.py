from __future__ import annotations

import hashlib
import io
import math
from typing import Any

import numpy as np
import pandas as pd


_ENCODINGS = ["utf-8", "latin-1", "cp1252", "utf-8-sig"]
_DELIMITERS = [",", "\t", ";", "|"]


def parse_csv_file(content: bytes) -> pd.DataFrame:
    """Parse CSV bytes trying multiple encodings and delimiters.

    Returns a clean DataFrame with whitespace-stripped column names.
    Raises ValueError if the file cannot be parsed as CSV.
    """
    last_exc: Exception = RuntimeError("Unknown parsing error")
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
                # Must have at least one row and one column
                if df.empty or df.shape[1] == 0:
                    continue
                # Strip whitespace from column names
                df.columns = [str(c).strip() for c in df.columns]
                # If only one column but delimiter was comma it probably worked
                return df
            except Exception as exc:
                last_exc = exc
                continue
    raise ValueError(f"Cannot parse CSV file: {last_exc}") from last_exc


def compute_file_hash(content: bytes) -> str:
    """Return SHA-256 hex digest of file bytes."""
    return hashlib.sha256(content).hexdigest()


def get_column_types(df: pd.DataFrame) -> dict[str, str]:
    """Return a mapping of column name → 'numeric' | 'categorical' | 'datetime'."""
    result: dict[str, str] = {}
    for col in df.columns:
        dtype = df[col].dtype
        if pd.api.types.is_numeric_dtype(dtype):
            result[col] = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(dtype):
            result[col] = "datetime"
        else:
            # Try to coerce to datetime
            try:
                parsed = pd.to_datetime(df[col].dropna().head(20), infer_datetime_format=True, errors="raise")
                if len(parsed) > 0:
                    result[col] = "datetime"
                    continue
            except Exception:
                pass
            result[col] = "categorical"
    return result


def get_missing_summary(df: pd.DataFrame) -> dict[str, int]:
    """Return {column_name: missing_count} for columns that have missing values."""
    missing = df.isna().sum()
    return {col: int(count) for col, count in missing.items() if count > 0}


def _safe_value(v: Any) -> Any:
    """Convert a value to a JSON-safe type."""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        if math.isnan(float(v)) or math.isinf(float(v)):
            return None
        return float(v)
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, (np.ndarray,)):
        return v.tolist()
    if pd.isna(v) if not isinstance(v, (list, dict, tuple)) else False:
        return None
    return v


def get_preview_data(df: pd.DataFrame, n: int = 10) -> list[dict[str, Any]]:
    """Return the first *n* rows as a list of dicts with NaN replaced by None."""
    subset = df.head(n)
    rows: list[dict[str, Any]] = []
    for _, row in subset.iterrows():
        clean_row: dict[str, Any] = {}
        for col, val in row.items():
            try:
                clean_row[col] = _safe_value(val)
            except Exception:
                clean_row[col] = None
        rows.append(clean_row)
    return rows
