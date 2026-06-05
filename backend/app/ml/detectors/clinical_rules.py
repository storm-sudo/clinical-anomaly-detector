from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional
import pandas as pd
import numpy as np
from rapidfuzz import fuzz, process

logger = logging.getLogger(__name__)

CLINICAL_RANGES = {
    'hemoglobin': {'min': 7.0, 'max': 20.0, 'unit': 'g/dL', 'critical_low': 5.0, 'critical_high': 22.0},
    'wbc': {'min': 1.0, 'max': 100.0, 'unit': '10^3/uL', 'critical_low': 0.5, 'critical_high': 150.0},
    'platelets': {'min': 10.0, 'max': 1500.0, 'unit': '10^3/uL', 'critical_low': 5.0, 'critical_high': 2000.0},
    'sodium': {'min': 110.0, 'max': 170.0, 'unit': 'mEq/L', 'critical_low': 100.0, 'critical_high': 180.0},
    'potassium': {'min': 2.0, 'max': 8.0, 'unit': 'mEq/L', 'critical_low': 1.5, 'critical_high': 9.0},
    'creatinine': {'min': 0.1, 'max': 20.0, 'unit': 'mg/dL', 'critical_low': 0.0, 'critical_high': 30.0},
    'glucose': {'min': 20.0, 'max': 800.0, 'unit': 'mg/dL', 'critical_low': 10.0, 'critical_high': 1000.0},
    'alt': {'min': 0.0, 'max': 5000.0, 'unit': 'U/L'},
    'ast': {'min': 0.0, 'max': 5000.0, 'unit': 'U/L'},
    'bilirubin': {'min': 0.0, 'max': 50.0, 'unit': 'mg/dL'},
    'systolic_bp': {'min': 50.0, 'max': 250.0, 'unit': 'mmHg', 'critical_low': 40.0, 'critical_high': 300.0},
    'diastolic_bp': {'min': 20.0, 'max': 150.0, 'unit': 'mmHg'},
    'heart_rate': {'min': 20.0, 'max': 250.0, 'unit': 'bpm', 'critical_low': 10.0, 'critical_high': 300.0},
    'temperature': {'min': 32.0, 'max': 43.0, 'unit': 'C'},
    'weight': {'min': 1.0, 'max': 300.0, 'unit': 'kg'},
    'bmi': {'min': 10.0, 'max': 80.0, 'unit': 'kg/m2'},
    'dose': {'min': 0.0, 'max': 10000.0, 'unit': 'mg'},
}

# Mapping aliases to clinical concepts (used in rapidfuzz matching)
CLINICAL_ALIASES = {
    'hemoglobin': ['hemoglobin', 'hgb', 'hb', 'haemoglobin'],
    'wbc': ['wbc', 'white blood cells', 'leukocytes', 'wbc_count'],
    'platelets': ['platelets', 'plt', 'platelet count', 'thrombocytes'],
    'sodium': ['sodium', 'na', 'na+'],
    'potassium': ['potassium', 'k', 'k+'],
    'creatinine': ['creatinine', 'cr', 'crea'],
    'glucose': ['glucose', 'gluc', 'blood sugar'],
    'alt': ['alt', 'sgpt', 'alanine aminotransferase'],
    'ast': ['ast', 'sgot', 'aspartate aminotransferase'],
    'bilirubin': ['bilirubin', 'bili', 'total bilirubin'],
    'systolic_bp': ['systolic', 'sbp', 'systolic bp', 'systolic blood pressure'],
    'diastolic_bp': ['diastolic', 'dbp', 'diastolic bp', 'diastolic blood pressure'],
    'heart_rate': ['heart rate', 'hr', 'pulse', 'pulse rate'],
    'temperature': ['temperature', 'temp', 'body temperature'],
    'weight': ['weight', 'wt', 'weight kg'],
    'bmi': ['bmi', 'body mass index'],
    'dose': ['dose', 'dosage', 'amount'],
}

@dataclass
class ClinicalAnomaly:
    row_index: int
    column_name: str
    value: float
    expected_min: float
    expected_max: float
    anomaly_score: float
    severity: str
    anomaly_type: str
    clinical_significance: str

class ClinicalRulesDetector:
    def __init__(self, data_type: str = 'auto'):
        self.data_type = data_type

    def _map_columns_to_clinical(self, columns: list[str]) -> dict[str, str]:
        """Maps original dataframe column names to canonical CLINICAL_RANGES keys."""
        col_map: dict[str, str] = {}
        for col in columns:
            col_lower = col.lower()
            # 1. Try exact or substring matches in alias lists
            matched_key = None
            for key, aliases in CLINICAL_ALIASES.items():
                if col_lower == key or col_lower in aliases:
                    matched_key = key
                    break
            
            # 2. Try fuzzy matching if no exact alias matches
            if not matched_key:
                best_match = None
                best_score = 0.0
                for key, aliases in CLINICAL_ALIASES.items():
                    for alias in aliases:
                        score = fuzz.ratio(col_lower, alias)
                        if score > best_score:
                            best_score = score
                            best_match = key
                if best_score >= 80:
                    matched_key = best_match

            if matched_key:
                col_map[col] = matched_key
        return col_map

    def detect_out_of_range(self, df: pd.DataFrame, col_map: dict[str, str]) -> list[ClinicalAnomaly]:
        """Checks values against physiological ranges defined in CLINICAL_RANGES."""
        results: list[ClinicalAnomaly] = []
        for col, concept in col_map.items():
            if not pd.api.types.is_numeric_dtype(df[col].dtype):
                continue
            
            rules = CLINICAL_RANGES[concept]
            expected_min = rules['min']
            expected_max = rules['max']
            crit_low = rules.get('critical_low')
            crit_high = rules.get('critical_high')
            unit = rules.get('unit', '')

            for idx, raw_val in df[col].items():
                if pd.isna(raw_val):
                    continue
                val = float(raw_val)

                # Check critical bounds first
                is_crit = False
                if crit_low is not None and val < crit_low:
                    is_crit = True
                    desc = f"Critical low value {val} {unit} is below safety threshold ({crit_low})."
                elif crit_high is not None and val > crit_high:
                    is_crit = True
                    desc = f"Critical high value {val} {unit} is above safety threshold ({crit_high})."

                if is_crit:
                    results.append(
                        ClinicalAnomaly(
                            row_index=int(idx),
                            column_name=col,
                            value=val,
                            expected_min=float(expected_min),
                            expected_max=float(expected_max),
                            anomaly_score=1.0,
                            severity="CRITICAL",
                            anomaly_type="critical_physiological_range",
                            clinical_significance=desc
                        )
                    )
                    continue

                # Check normal physiological bounds
                if val < expected_min or val > expected_max:
                    severity = "HIGH"
                    score = 0.8
                    desc = f"Out-of-range physiological value {val} {unit} (expected [{expected_min}-{expected_max}])."
                    
                    results.append(
                        ClinicalAnomaly(
                            row_index=int(idx),
                            column_name=col,
                            value=val,
                            expected_min=float(expected_min),
                            expected_max=float(expected_max),
                            anomaly_score=score,
                            severity=severity,
                            anomaly_type="out_of_physiological_range",
                            clinical_significance=desc
                        )
                    )
        return results

    def detect_cross_field_inconsistencies(self, df: pd.DataFrame, col_map: dict[str, str]) -> list[ClinicalAnomaly]:
        """Detects inconsistencies between columns in the same row (e.g. diastolic BP > systolic BP)."""
        results: list[ClinicalAnomaly] = []
        
        # Find systolic and diastolic columns
        systolic_col = next((col for col, concept in col_map.items() if concept == 'systolic_bp'), None)
        diastolic_col = next((col for col, concept in col_map.items() if concept == 'diastolic_bp'), None)

        if systolic_col and diastolic_col:
            for idx in df.index:
                s_val = df.loc[idx, systolic_col]
                d_val = df.loc[idx, diastolic_col]
                if pd.isna(s_val) or pd.isna(d_val):
                    continue
                sys = float(s_val)
                dia = float(d_val)
                if dia >= sys:
                    results.append(
                        ClinicalAnomaly(
                            row_index=int(idx),
                            column_name=diastolic_col,
                            value=dia,
                            expected_min=0,
                            expected_max=sys - 10,  # diastolic should be significantly lower
                            anomaly_score=0.9,
                            severity="HIGH",
                            anomaly_type="cross_field_inconsistency",
                            clinical_significance=f"Diastolic BP ({dia} mmHg) is greater than or equal to Systolic BP ({sys} mmHg)."
                        )
                    )

        # Date consistency checks (if dates exist in the dataframe)
        date_cols = [c for c in df.columns if 'date' in c.lower()]
        if len(date_cols) >= 2:
            start_date_col = next((c for c in date_cols if 'start' in c.lower() or 'onset' in c.lower()), None)
            end_date_col = next((c for c in date_cols if 'end' in c.lower() or 'stop' in c.lower() or 'resolution' in c.lower()), None)
            
            if start_date_col and end_date_col:
                for idx in df.index:
                    s_date_raw = df.loc[idx, start_date_col]
                    e_date_raw = df.loc[idx, end_date_col]
                    if pd.isna(s_date_raw) or pd.isna(e_date_raw) or s_date_raw == "" or e_date_raw == "":
                        continue
                    try:
                        s_date = pd.to_datetime(s_date_raw)
                        e_date = pd.to_datetime(e_date_raw)
                        if e_date < s_date:
                            results.append(
                                ClinicalAnomaly(
                                    row_index=int(idx),
                                    column_name=end_date_col,
                                    value=0, # placeholder
                                    expected_min=0,
                                    expected_max=0,
                                    anomaly_score=0.8,
                                    severity="HIGH",
                                    anomaly_type="cross_field_inconsistency",
                                    clinical_significance=f"End date ({e_date_raw}) is earlier than start date ({s_date_raw})."
                                )
                            )
                    except Exception:
                        pass # Ignore parsing issues

        return results

    def detect_longitudinal_changes(self, df: pd.DataFrame, subject_col: str, timepoint_col: str, col_map: dict[str, str]) -> list[ClinicalAnomaly]:
        """Checks for abnormal shifts or repeating values in subjects over visits/timepoints."""
        results: list[ClinicalAnomaly] = []
        if not subject_col or subject_col not in df.columns:
            return results

        # Sort values by subject and timepoint if timepoint exists
        sort_cols = [subject_col]
        if timepoint_col and timepoint_col in df.columns:
            sort_cols.append(timepoint_col)
        
        df_sorted = df.sort_values(by=sort_cols)
        
        for subject_id, subj_group in df_sorted.groupby(subject_col):
            if len(subj_group) < 2:
                continue

            for col, concept in col_map.items():
                if concept in ['subject_id', 'timepoint'] or not pd.api.types.is_numeric_dtype(subj_group[col].dtype):
                    continue

                values = subj_group[col].dropna()
                if len(values) < 2:
                    continue

                # 1. Check for extreme consecutive shifts
                # e.g., >20% change in weight or >3x change in vital signs or lab parameters
                val_list = list(values)
                idx_list = list(values.index)

                for i in range(len(val_list) - 1):
                    v1 = float(val_list[i])
                    v2 = float(val_list[i+1])
                    idx2 = idx_list[i+1]
                    
                    if concept == 'weight':
                        # Weight shift check
                        pct_change = abs(v2 - v1) / max(v1, 1e-5)
                        if pct_change > 0.20:
                            results.append(
                                ClinicalAnomaly(
                                    row_index=int(idx2),
                                    column_name=col,
                                    value=v2,
                                    expected_min=v1 * 0.8,
                                    expected_max=v1 * 1.2,
                                    anomaly_score=0.8,
                                    severity="HIGH",
                                    anomaly_type="abnormal_longitudinal_shift",
                                    clinical_significance=f"Subject weight changed abnormally by {pct_change * 100:.1f}% ({v1} kg to {v2} kg) in consecutive visits."
                                )
                            )
                    else:
                        # General 3x change check for vital signs / labs
                        ratio = v2 / max(v1, 1e-5) if v2 > v1 else v1 / max(v2, 1e-5)
                        if ratio > 3.0:
                            results.append(
                                ClinicalAnomaly(
                                    row_index=int(idx2),
                                    column_name=col,
                                    value=v2,
                                    expected_min=v1 / 3.0,
                                    expected_max=v1 * 3.0,
                                    anomaly_score=0.7,
                                    severity="MEDIUM",
                                    anomaly_type="abnormal_longitudinal_shift",
                                    clinical_significance=f"Clinical parameter '{col}' experienced a sudden {ratio:.1f}-fold change from {v1} to {v2}."
                                )
                            )

                # 2. Check for repeating vital signs / clinical values across visits (Copy-Paste / entry error check)
                # It is clinically highly improbable to have the exact same temperature, pulse, or blood pressure down to the decimal across 3+ consecutive visits
                if concept in ['temperature', 'heart_rate', 'systolic_bp', 'diastolic_bp', 'weight']:
                    consecutive_repeats = 1
                    last_val = None
                    last_idx = None
                    
                    for v, idx in zip(val_list, idx_list):
                        if last_val is not None and abs(v - last_val) < 1e-6:
                            consecutive_repeats += 1
                        else:
                            consecutive_repeats = 1
                        last_val = v
                        last_idx = idx
                        
                        if consecutive_repeats >= 3:
                            results.append(
                                ClinicalAnomaly(
                                    row_index=int(last_idx),
                                    column_name=col,
                                    value=v,
                                    expected_min=0,
                                    expected_max=0,
                                    anomaly_score=0.7,
                                    severity="MEDIUM",
                                    anomaly_type="suspicious_repeated_value",
                                    clinical_significance=f"Suspicious repeating values: parameter '{col}' remained exactly {v} for {consecutive_repeats} consecutive visits."
                                )
                            )
        return results

    def detect_all(self, df: pd.DataFrame, subject_col: str = None, timepoint_col: str = None) -> list[ClinicalAnomaly]:
        """Runs all clinical logic and rule-based checks."""
        col_map = self._map_columns_to_clinical(df.columns.tolist())
        
        # Try to identify subject and timepoint columns if not passed
        if not subject_col:
            subject_col = next((col for col, concept in col_map.items() if concept == 'subject_id'), None)
        if not timepoint_col:
            timepoint_col = next((col for col, concept in col_map.items() if concept == 'timepoint'), None)

        anomalies = []
        anomalies.extend(self.detect_out_of_range(df, col_map))
        anomalies.extend(self.detect_cross_field_inconsistencies(df, col_map))
        anomalies.extend(self.detect_longitudinal_changes(df, subject_col, timepoint_col, col_map))
        return anomalies
