from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

CLINICAL_CONTEXT = {
    'hemoglobin': {
        'low': "Low hemoglobin (anemia) is a common protocol safety concern. It may indicate drug-induced bone marrow suppression, occult gastrointestinal bleeding, or nutritional deficiency.",
        'high': "Elevated hemoglobin (polycythemia) can indicate severe dehydration, hemoconcentration, chronic hypoxia, or pulmonary conditions."
    },
    'wbc': {
        'low': "Leukopenia (low WBC) is a critical concern for immunosuppression. It puts the subject at high risk for opportunistic infections and may indicate drug-induced myelosuppression.",
        'high': "Leukocytosis (high WBC) is typically indicative of an active infection, inflammatory response, physical stress, or hematologic malignancy."
    },
    'platelets': {
        'low': "Thrombocytopenia (low platelets) represents a severe safety risk for spontaneous bleeding or hemorrhage. Often a dose-limiting toxicity in oncology and antiviral trials.",
        'high': "Thrombocytosis (high platelets) can increase the risk of thrombotic events, stroke, or indicate underlying inflammatory disease/marrow disorders."
    },
    'sodium': {
        'low': "Hyponatremia (low sodium) can lead to cerebral edema, altered mental status, and seizures. Often caused by drug-induced SIADH or fluid overload.",
        'high': "Hypernatremia (high sodium) indicates dehydration, excessive sodium intake, or impaired renal concentrating ability."
    },
    'potassium': {
        'low': "Hypokalemia (low potassium) is a major cardiac risk, predisposing the subject to QT prolongation, muscle weakness, and lethal cardiac arrhythmias.",
        'high': "Hyperkalemia (high potassium) is a critical medical emergency that can cause ECG changes (peaked T-waves), muscle paralysis, or cardiac arrest."
    },
    'creatinine': {
        'high': "Elevated creatinine indicates acute kidney injury (AKI) or progressive renal impairment. Requires close monitoring for drug nephrotoxicity and potential dose adjustment."
    },
    'glucose': {
        'low': "Hypoglycemia (low blood sugar) is a dangerous acute event causing neuroglycopenic symptoms, confusion, or loss of consciousness.",
        'high': "Hyperglycemia (high blood sugar) indicates uncontrolled diabetes, insulin resistance, or steroid-induced glucose intolerance."
    },
    'alt': {
        'high': "Elevated alanine aminotransferase (ALT) is a sensitive indicator of hepatocellular damage. Values >3x upper limit of normal (ULN) are standard protocol thresholds for drug-induced liver injury (DILI)."
    },
    'ast': {
        'high': "Elevated aspartate aminotransferase (AST) indicates cellular injury in the liver, heart, or skeletal muscle. When combined with elevated ALT, indicates active hepatotoxicity."
    },
    'bilirubin': {
        'high': "Hyperbilirubinemia (high bilirubin) indicates biliary obstruction, hemolysis, or impaired hepatic clearance. Concurrent ALT >3x ULN and Bilirubin >2x ULN meets 'Hy's Law' criteria for severe DILI."
    },
    'systolic_bp': {
        'low': "Hypotension (low systolic BP) can cause tissue hypoperfusion, dizziness, and syncope. May indicate anaphylaxis, dehydration, or drug toxicity.",
        'high': "Hypertension (high systolic BP) poses cardiovascular risks. Values >180 mmHg are considered hypertensive crises, requiring immediate clinical intervention."
    },
    'diastolic_bp': {
        'low': "Low diastolic blood pressure can compromise coronary artery perfusion.",
        'high': "Elevated diastolic BP indicates increased systemic vascular resistance and long-term cardiovascular strain."
    },
    'heart_rate': {
        'low': "Bradycardia (low heart rate) can indicate drug-induced sinus node suppression (e.g. beta-blockers), conduction blocks, or autonomic dysfunction.",
        'high': "Tachycardia (high heart rate) can indicate infection/fever, cardiovascular stress, dehydration, or drug-induced sympathetic activation."
    },
    'temperature': {
        'low': "Hypothermia (low body temp) can indicate exposure, shock, or metabolic disorders.",
        'high': "Pyrexia (fever) suggests an active infectious process, drug fever, or acute infusion reaction."
    },
    'weight': {
        'low': "Sudden weight loss may indicate cachexia, severe gastrointestinal toxicity, or metabolic disease.",
        'high': "Sudden weight gain (e.g. >2 kg in 48h) is highly suspicious for acute fluid retention, potentially indicative of renal failure, congestive heart failure, or drug-induced edema."
    }
}

class ClinicalContextEngine:
    def get_context(self, canonical_column: str, value: float, expected_min: float, expected_max: float) -> str:
        """Returns the clinical significance text for an anomaly based on the canonical column name."""
        concept = canonical_column.lower()
        if concept not in CLINICAL_CONTEXT:
            return "Value is outside statistical or rule-based bounds for this trial parameter."

        context_dict = CLINICAL_CONTEXT[concept]
        
        # Decide if high or low
        if value < expected_min:
            return context_dict.get('low', context_dict.get('high', "Value is below physiological normal bounds."))
        elif value > expected_max:
            return context_dict.get('high', context_dict.get('low', "Value is above physiological normal bounds."))
        
        # Fallback if inside bounds but flagged (e.g. longitudinal)
        return f"Clinical variation in parameter '{canonical_column}' detected."
