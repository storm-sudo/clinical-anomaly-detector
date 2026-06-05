from __future__ import annotations

import pandas as pd
import numpy as np
from app.ml.detectors.statistical import StatisticalDetector

def test_zscore_detects_obvious_outlier():
    # 100.0 is an obvious outlier relative to a series of 10.0s
    data = pd.Series([10.0] * 19 + [100.0])
    data.name = "lab_value"
    
    detector = StatisticalDetector()
    anomalies = detector.detect_zscore(data, threshold=3.0)
    
    assert len(anomalies) > 0
    # The outlier is at index 19
    outlier = next((a for a in anomalies if a.row_index == 19), None)
    assert outlier is not None
    assert outlier.is_anomaly
    assert outlier.z_score is not None
    assert outlier.z_score > 3.0

def test_iqr_detects_extreme_value():
    # 50.0 is way outside IQR bounds of [0.9, 1.2]
    data = pd.Series([1.0, 1.2, 1.1, 0.9, 1.0, 1.1, 1.0, 1.1, 1.2, 50.0])
    data.name = "vital_sign"
    
    detector = StatisticalDetector()
    anomalies = detector.detect_iqr(data, factor=1.5)
    
    assert len(anomalies) > 0
    outlier = next((a for a in anomalies if a.row_index == 9), None)
    assert outlier is not None
    assert outlier.is_anomaly
    assert outlier.anomaly_score > 0.5

def test_modified_zscore_robust_to_non_normal():
    # Modified Z-score using Median Absolute Deviation (MAD) is robust to outliers
    data = pd.Series([10.0, 10.2, 9.8, 10.1, 10.0, 9.9, 10.0, 200.0])
    data.name = "measurement"
    
    detector = StatisticalDetector()
    anomalies = detector.detect_modified_zscore(data, threshold=3.5)
    
    assert len(anomalies) > 0
    outlier = next((a for a in anomalies if a.row_index == 7), None)
    assert outlier is not None
    assert outlier.is_anomaly
