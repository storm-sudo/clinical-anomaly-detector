from __future__ import annotations

import io
import logging
from datetime import datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

logger = logging.getLogger(__name__)

# Severity colour map
_SEVERITY_COLOURS = {
    "CRITICAL": colors.HexColor("#DC2626"),
    "HIGH": colors.HexColor("#EA580C"),
    "MEDIUM": colors.HexColor("#D97706"),
    "LOW": colors.HexColor("#16A34A"),
}


class ReportService:
    """Generates professional PDF reports for completed analyses."""

    def generate_pdf_report(
        self,
        analysis: Any,
        anomalies: list[Any],
        dataset: Any,
    ) -> bytes:
        """Build and return a ReportLab PDF as bytes."""
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
            title=f"Clinical Data Anomaly Report — {getattr(dataset, 'trial_name', 'Unknown Trial')}",
        )

        styles = getSampleStyleSheet()
        story = []

        # ── Cover page ────────────────────────────────────────────────────────
        story += self._cover_page(styles, analysis, dataset)
        story.append(PageBreak())

        # ── Executive summary ─────────────────────────────────────────────────
        story += self._executive_summary(styles, analysis)
        story.append(Spacer(1, 0.5 * cm))

        # ── Methodology ───────────────────────────────────────────────────────
        story += self._methodology(styles, analysis)
        story.append(Spacer(1, 0.5 * cm))

        # ── Column statistics ─────────────────────────────────────────────────
        if analysis.column_statistics:
            story += self._column_statistics(styles, analysis.column_statistics)
            story.append(Spacer(1, 0.5 * cm))

        # ── Anomaly table ─────────────────────────────────────────────────────
        if anomalies:
            story.append(PageBreak())
            story += self._anomaly_table(styles, anomalies)
            story.append(Spacer(1, 0.5 * cm))

        # ── Recommendations ───────────────────────────────────────────────────
        if analysis.recommendations:
            story += self._recommendations(styles, analysis.recommendations)

        # ── Audit trail ───────────────────────────────────────────────────────
        story.append(PageBreak())
        story += self._audit_trail(styles, analysis)

        doc.build(story)
        return buf.getvalue()

    # ── Private section builders ──────────────────────────────────────────────

    def _cover_page(self, styles, analysis, dataset) -> list:
        elements = []
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Title"],
            fontSize=24,
            spaceAfter=12,
            textColor=colors.HexColor("#1E3A5F"),
        )
        subtitle_style = ParagraphStyle(
            "Subtitle",
            parent=styles["Normal"],
            fontSize=14,
            textColor=colors.HexColor("#475569"),
            spaceAfter=6,
        )
        elements.append(Spacer(1, 3 * cm))
        elements.append(Paragraph("Clinical Data Anomaly Report", title_style))
        elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1E3A5F")))
        elements.append(Spacer(1, 0.5 * cm))

        trial_name = getattr(dataset, "trial_name", "N/A") or "N/A"
        trial_phase = getattr(dataset, "trial_phase", "N/A") or "N/A"
        dataset_name = getattr(dataset, "name", "N/A")
        generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

        meta = [
            ("Trial Name:", trial_name),
            ("Trial Phase:", trial_phase),
            ("Dataset:", dataset_name),
            ("Generated:", generated_at),
            ("Report ID:", str(analysis.id)),
        ]
        for label, value in meta:
            elements.append(
                Paragraph(f"<b>{label}</b> {value}", subtitle_style)
            )
        return elements

    def _executive_summary(self, styles, analysis) -> list:
        elements = [Paragraph("Executive Summary", styles["Heading1"])]
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
        elements.append(Spacer(1, 0.3 * cm))

        score = analysis.overall_data_quality_score or 0
        score_colour = (
            "#DC2626" if score < 60
            else "#D97706" if score < 80
            else "#16A34A"
        )

        summary_data = [
            ["Metric", "Value"],
            ["Overall Data Quality Score", f"{score:.1f} / 100"],
            ["Total Rows Analyzed", str(analysis.total_rows_analyzed or 0)],
            ["Total Anomalies Detected", str(analysis.total_anomalies_detected or 0)],
            ["Anomaly Rate", f"{analysis.anomaly_rate_percent or 0:.2f}%"],
            ["Processing Time", f"{analysis.processing_time_seconds or 0:.1f}s"],
        ]

        table = Table(summary_data, colWidths=[9 * cm, 8 * cm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A5F")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TEXTCOLOR", (1, 1), (1, 1), colors.HexColor(score_colour)),
            ("FONTNAME", (1, 1), (1, 1), "Helvetica-Bold"),
        ]))
        elements.append(table)

        # Severity breakdown
        summary = analysis.anomaly_summary or {}
        by_severity = summary.get("by_severity", {})
        if by_severity:
            elements.append(Spacer(1, 0.4 * cm))
            elements.append(Paragraph("Anomalies by Severity", styles["Heading2"]))
            sev_data = [["Severity", "Count"]] + [
                [k, str(v)] for k, v in by_severity.items()
            ]
            sev_table = Table(sev_data, colWidths=[9 * cm, 8 * cm])
            sev_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))
            elements.append(sev_table)
        return elements

    def _methodology(self, styles, analysis) -> list:
        elements = [Paragraph("Methodology", styles["Heading1"])]
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
        elements.append(Spacer(1, 0.3 * cm))

        config = analysis.config or {}
        algorithms = []
        if config.get("run_statistical", True):
            algorithms.append("• Z-score, IQR, Modified Z-score, Grubbs Test (Statistical)")
        if config.get("run_isolation_forest", True):
            contamination = config.get("contamination", 0.05)
            algorithms.append(f"• Isolation Forest (contamination={contamination})")
        if config.get("run_lof", True):
            algorithms.append("• Local Outlier Factor (LOF)")
        if config.get("run_clinical_rules", True):
            algorithms.append("• Clinical Rules Engine (physiological range checks)")
        if config.get("run_missing_analysis", True):
            algorithms.append("• Missing Data Analysis")
        if config.get("run_duplicate_check", True):
            algorithms.append("• Duplicate Detection (exact + near-duplicate)")

        for alg in algorithms:
            elements.append(Paragraph(alg, styles["Normal"]))

        algo_results = analysis.algorithm_results or {}
        if algo_results:
            elements.append(Spacer(1, 0.3 * cm))
            elements.append(Paragraph("Algorithm Results", styles["Heading2"]))
            alg_data = [["Algorithm", "Anomalies Found", "Status"]]
            for name, info in algo_results.items():
                alg_data.append([
                    name.replace("_", " ").title(),
                    str(info.get("count", 0)),
                    info.get("status", ""),
                ])
            alg_table = Table(alg_data, colWidths=[7 * cm, 5 * cm, 5 * cm])
            alg_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))
            elements.append(alg_table)
        return elements

    def _column_statistics(self, styles, col_stats: dict) -> list:
        elements = [Paragraph("Column Statistics", styles["Heading1"])]
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
        elements.append(Spacer(1, 0.3 * cm))

        headers = ["Column", "Count", "Missing%", "Mean", "Std", "Min", "Max"]
        rows = [headers]
        for col, stats in list(col_stats.items())[:30]:  # max 30 columns
            missing_pct = stats.get("missing_percent", 0)
            rows.append([
                col[:25],
                str(stats.get("count", "")),
                f"{missing_pct:.1f}%",
                f"{stats.get('mean', ''):.3f}" if isinstance(stats.get("mean"), (int, float)) else "",
                f"{stats.get('std', ''):.3f}" if isinstance(stats.get("std"), (int, float)) else "",
                f"{stats.get('min', ''):.3f}" if isinstance(stats.get("min"), (int, float)) else "",
                f"{stats.get('max', ''):.3f}" if isinstance(stats.get("max"), (int, float)) else "",
            ])

        col_widths = [4.5 * cm, 2 * cm, 2.5 * cm, 2.5 * cm, 2.5 * cm, 2.5 * cm, 2.5 * cm]
        table = Table(rows, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(table)
        return elements

    def _anomaly_table(self, styles, anomalies: list) -> list:
        elements = [Paragraph("Detected Anomalies", styles["Heading1"])]
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
        elements.append(Spacer(1, 0.3 * cm))

        headers = ["Row", "Column", "Value", "Score", "Severity", "Method", "Action"]
        rows = [headers]
        for a in anomalies[:200]:  # cap at 200 rows for PDF size
            rows.append([
                str(getattr(a, "row_index", "")),
                str(getattr(a, "column_name", ""))[:20],
                str(getattr(a, "value", ""))[:15],
                f"{getattr(a, 'anomaly_score', 0):.2f}",
                str(getattr(a, "severity", "")),
                str(getattr(a, "detection_method", ""))[:15],
                str(getattr(a, "suggested_action", "") or "")[:25],
            ])

        col_widths = [1.5 * cm, 3 * cm, 2.5 * cm, 1.5 * cm, 2 * cm, 3 * cm, 4 * cm]
        table = Table(rows, colWidths=col_widths, repeatRows=1)

        style_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A5F")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]
        # Colour-code severity column
        sev_col = 4
        for i, row in enumerate(rows[1:], start=1):
            sev = row[sev_col] if len(row) > sev_col else ""
            bg = _SEVERITY_COLOURS.get(sev, colors.white)
            style_cmds.append(("BACKGROUND", (sev_col, i), (sev_col, i), bg))
            style_cmds.append(("TEXTCOLOR", (sev_col, i), (sev_col, i), colors.white))

        table.setStyle(TableStyle(style_cmds))
        elements.append(table)

        if len(anomalies) > 200:
            elements.append(Spacer(1, 0.3 * cm))
            elements.append(
                Paragraph(
                    f"Note: Table shows first 200 of {len(anomalies)} anomalies. "
                    "Download the CSV export for the complete list.",
                    styles["Italic"],
                )
            )
        return elements

    def _recommendations(self, styles, recommendations: list[str]) -> list:
        elements = [Paragraph("Recommendations", styles["Heading1"])]
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
        elements.append(Spacer(1, 0.3 * cm))
        for i, rec in enumerate(recommendations, 1):
            elements.append(Paragraph(f"{i}. {rec}", styles["Normal"]))
            elements.append(Spacer(1, 0.2 * cm))
        return elements

    def _audit_trail(self, styles, analysis) -> list:
        elements = [Paragraph("Audit Trail", styles["Heading1"])]
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
        elements.append(Spacer(1, 0.3 * cm))

        data = [
            ["Event", "Timestamp"],
            ["Analysis Created", str(analysis.created_at)[:19] if analysis.created_at else ""],
            ["Analysis Started", str(analysis.started_at)[:19] if analysis.started_at else ""],
            ["Analysis Completed", str(analysis.completed_at)[:19] if analysis.completed_at else ""],
        ]
        table = Table(data, colWidths=[9 * cm, 8 * cm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(table)
        return elements
