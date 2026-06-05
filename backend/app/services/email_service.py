from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class EmailService:
    """Sends transactional emails via SendGrid, with graceful fallback."""

    def __init__(self, api_key: Optional[str] = None, from_email: str = "noreply@clinicaldetector.dev") -> None:
        self.api_key = api_key
        self.from_email = from_email

    def send_analysis_complete(
        self,
        user_email: str,
        user_name: str,
        analysis_id: str,
        anomaly_count: int,
        quality_score: float,
        app_url: str = "http://localhost:3000",
    ) -> bool:
        """Send an analysis-complete notification email.

        Returns True if sent successfully, False if skipped or failed.
        """
        if not self.api_key:
            logger.info(
                "[EmailService] No SendGrid API key configured. Skipping email to %s "
                "(analysis=%s, anomalies=%d, score=%.1f)",
                user_email,
                analysis_id,
                anomaly_count,
                quality_score,
            )
            return False

        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, To, From

            score_label = (
                "Excellent" if quality_score >= 90
                else "Good" if quality_score >= 75
                else "Fair" if quality_score >= 60
                else "Poor"
            )

            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #1E3A5F; padding: 24px; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 20px;">Analysis Complete</h1>
                    <p style="color: #93C5FD; margin: 4px 0 0;">Clinical Data Anomaly Detector</p>
                </div>
                <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px;">
                    <p>Hi <b>{user_name}</b>,</p>
                    <p>Your anomaly detection analysis has completed successfully.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                        <tr>
                            <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold;">Data Quality Score</td>
                            <td style="padding: 8px 12px;">{quality_score:.1f}/100 ({score_label})</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold;">Anomalies Detected</td>
                            <td style="padding: 8px 12px;">{anomaly_count}</td>
                        </tr>
                    </table>
                    <a href="{app_url}/analyses/{analysis_id}"
                       style="display: inline-block; background: #1E3A5F; color: white; padding: 12px 24px;
                              border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px;">
                        View Full Report
                    </a>
                    <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
                        This is an automated notification from the Clinical Data Anomaly Detector.
                    </p>
                </div>
            </body>
            </html>
            """

            message = Mail(
                from_email=self.from_email,
                to_emails=user_email,
                subject=f"Analysis Complete — {anomaly_count} anomalies detected (Quality: {quality_score:.0f}/100)",
                html_content=html_body,
            )

            client = SendGridAPIClient(self.api_key)
            response = client.send(message)
            logger.info(
                "Email sent to %s (status=%d)", user_email, response.status_code
            )
            return True

        except Exception as exc:
            logger.error("Failed to send email to %s: %s", user_email, exc)
            return False

    def send_welcome(self, user_email: str, user_name: str) -> bool:
        """Send a welcome email to a newly registered user."""
        if not self.api_key:
            logger.info("[EmailService] Skipping welcome email to %s", user_email)
            return False
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Welcome to Clinical Data Anomaly Detector, {user_name}!</h2>
                <p>Your account has been created. You can now upload clinical trial datasets and
                   run ML-powered anomaly detection to ensure data quality.</p>
                <p>Get started by uploading your first dataset.</p>
            </body>
            </html>
            """

            message = Mail(
                from_email=self.from_email,
                to_emails=user_email,
                subject="Welcome to Clinical Data Anomaly Detector",
                html_content=html_body,
            )
            client = SendGridAPIClient(self.api_key)
            client.send(message)
            return True
        except Exception as exc:
            logger.error("Failed to send welcome email to %s: %s", user_email, exc)
            return False
