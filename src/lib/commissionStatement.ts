import { jsPDF } from "jspdf";

import type { CommissionEntry, CommissionPayout } from "../types";

/** PDF-safe currency: jsPDF's base fonts cannot render the ₱ glyph. */
const money = (amount: number): string => `PHP ${amount.toFixed(2)}`;

/**
 * Downloads a staff commission statement as a one-page PDF named
 * `COMMISSION-<staff>-<period>.pdf`.
 */
export const downloadCommissionStatement = (
    payout: CommissionPayout,
    entries: CommissionEntry[]
): void => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 48;
    let y = 58;

    doc.setFont("helvetica", "bold").setFontSize(16);
    doc.text("Raheem Make Up Studio and Salon", width / 2, y, {
        align: "center",
    });
    y += 22;
    doc.setFontSize(12);
    doc.text("COMMISSION STATEMENT", width / 2, y, { align: "center" });

    y += 14;
    doc.setDrawColor(201, 95, 120);
    doc.setLineWidth(1.2);
    doc.line(margin, y, width - margin, y);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    y += 26;
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text(`Staff: ${payout.staffName}`, margin, y);
    doc.text(`Payout: #${payout.id}`, width - margin, y, { align: "right" });
    y += 16;
    doc.text(`Period: ${payout.periodStart} to ${payout.periodEnd}`, margin, y);
    doc.text(`Status: ${payout.status}`, width - margin, y, { align: "right" });
    y += 24;

    doc.setFont("helvetica", "bold").setFontSize(9);
    doc.text("Date", margin, y);
    doc.text("Source", margin + 120, y);
    doc.text("Base", margin + 260, y);
    doc.text("Rate", margin + 340, y);
    doc.text("Commission", width - margin, y, { align: "right" });
    y += 6;
    doc.line(margin, y, width - margin, y);
    y += 14;

    doc.setFont("helvetica", "normal").setFontSize(9);
    for (const entry of entries) {
        if (y > height - 90) {
            doc.addPage();
            y = 56;
        }
        const date = String(entry.accruedAt).slice(0, 10);
        const source =
            entry.sourceType === "event"
                ? `Event ${entry.eventReference ?? entry.sourceId}`
                : (entry.transactionReference ?? `Appointment ${entry.sourceId}`);
        const rate =
            entry.rateType === "percent"
                ? `${entry.rateValue}%`
                : money(entry.rateValue);

        doc.text(date, margin, y);
        doc.text(doc.splitTextToSize(source, 130)[0] ?? "", margin + 120, y);
        doc.text(money(entry.baseAmount), margin + 260, y);
        doc.text(rate, margin + 340, y);
        doc.text(money(entry.commissionAmount), width - margin, y, {
            align: "right",
        });
        y += 16;
    }

    y += 4;
    doc.line(margin, y, width - margin, y);
    y += 20;
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("Total commission", margin, y);
    doc.text(money(payout.totalAmount), width - margin, y, { align: "right" });

    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.setTextColor(120);
    doc.text(
        "System-generated statement. Commission is a ledger record, not a payroll disbursement.",
        width / 2,
        height - 36,
        { align: "center" }
    );
    doc.setTextColor(0);

    doc.save(
        `COMMISSION-${payout.staffName.replace(/[^a-z0-9]+/gi, "-")}-${payout.periodStart}-${payout.periodEnd}.pdf`
    );
};
