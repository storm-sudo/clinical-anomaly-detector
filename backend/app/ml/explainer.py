from __future__ import annotations

import logging
from typing import Optional
from app.ml.clinical_context import ClinicalContextEngine

logger = logging.getLogger(__name__)

class ClinicalExplainer:
    def __init__(self):
        self.context_engine = ClinicalContextEngine()

    def explain_anomaly(
        self,
        column: str,
        value: float,
        z_score: Optional[float],
        expected_min: float,
        expected_max: float,
        methods: list[str],
        severity: str,
        canonical_column: Optional[str] = None
    ) -> tuple[str, str]:
        """Explains a detected anomaly, returning (clinical_significance, suggested_action)."""
        
        # Use canonical_column if provided, otherwise default to column name
        concept = canonical_column if canonical_column else column
        
        # Get domain explanation
        significance = self.context_engine.get_context(
            canonical_column=concept,
            value=value,
            expected_min=expected_min,
            expected_max=expected_max
        )

        # Append details about the detection
        methods_clean = [m.replace('_', ' ').title().replace('Lof', 'LOF') for m in methods]
        detect_details = f" Flagged by {', '.join(methods_clean)}."
        significance += detect_details

        # Get suggested action
        action = self.get_suggested_action(severity, methods[0] if methods else "")

        return significance, action

    def get_suggested_action(self, severity: str, anomaly_type: str) -> str:
        """Determines the protocol-defined action for the clinical researcher or coordinator."""
        severity = severity.upper()
        
        # Specific actions based on anomaly types if needed
        if 'missing' in anomaly_type.lower():
            return "Verify with site coordinator and request form completion. Check database entry log."
        if 'duplicate' in anomaly_type.lower():
            return "Investigate database ingestion pipeline. Confirm subject identity and merge records if duplicate."

        # Severity-based fallback actions
        actions = {
            'CRITICAL': "Immediate escalation required: Contact medical monitor within 24 hours. Initiate source data verification (SDV) and check safety/eligibility criteria.",
            'HIGH': "Flag for investigator/medical review during the next study call. Issue a formal data query to the clinical site.",
            'MEDIUM': "Verify value against source clinical documents (medical records/lab reports) and correct entry if typographical.",
            'LOW': "Monitor parameter trend. No immediate action required if subject is clinically stable."
        }
        
        return actions.get(severity, "Review flagged entry and verify against source data.")
