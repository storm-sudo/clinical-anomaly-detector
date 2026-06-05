from __future__ import annotations

import pandas as pd
from app.ml.pipeline import AnomalyDetectionPipeline

def test_pipeline_end_to_end(sample_df: pd.DataFrame):
    config = {
        "run_statistical": True,
        "run_isolation_forest": True,
        "run_lof": True,
        "run_missing_analysis": True,
        "run_duplicate_check": True,
        "run_clinical_rules": True,
        "contamination": 0.05,
        "zscore_threshold": 3.0,
        "iqr_factor": 1.5,
        "min_anomaly_score": 0.1,
        "data_type": "auto"
    }
    
    pipeline = AnomalyDetectionPipeline(config)
    result = pipeline.run(sample_df)
    
    assert result.total_rows_analyzed == 5
    assert result.total_anomalies_detected > 0
    assert 0.0 <= result.overall_data_quality_score <= 100.0
    assert result.processing_time_seconds > 0.0
    
    # Verify we flagged the heart_rate outlier (row index 4, value '240.0')
    heart_rate_anoms = [
        a for a in result.anomalies 
        if a["column_name"] == "heart_rate" and a["row_index"] == 4
    ]
    assert len(heart_rate_anoms) > 0
    assert heart_rate_anoms[0]["severity"] in ["HIGH", "CRITICAL"]
