import { jsPDF } from "jspdf";
import type { AppointmentView } from "../types";
import { formatClock, formatDateTime } from "./utils";

/** PDF-safe currency: jsPDF's base fonts cannot render the ₱ glyph. */
const money = (amount: number): string => `PHP ${amount.toFixed(2)}`;

const titleCase = (value: string): string =>
    value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

/**
 * Downloads the Official Receipt (O.R.) for a confirmed booking as a
 * one-page PDF named `OR-<reference>.pdf`.
 */
export const downloadReceipt = (
    booking: AppointmentView,
    manageUrl: string
): void => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 56;
    let y = 64;

    doc.setFont("helvetica", "bold").setFontSize(18);
    doc.text("Raheem Make Up Studio and Salon", width / 2, y, {
        align: "center",
    });

    y += 24;
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("OFFICIAL RECEIPT", width / 2, y, { align: "center" });

    y += 14;
    doc.setDrawColor(201, 95, 120);
    doc.setLineWidth(1.2);
    doc.line(margin, y, width - margin, y);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    y += 30;
    const row = (label: string, value: string, bold = false): void => {
        doc.setFont("helvetica", "bold").setFontSize(10);
        doc.text(label, margin, y);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.text(value, margin + 120, y);
        y += 18;
    };

    row("O.R. No.", booking.reference, true);
    row("Date issued", new Date().toLocaleString());
    y += 8;
    row("Customer", booking.customerName);
    row("Service", booking.serviceName);
    row("Staff", booking.staffName);
    row("Appointment", formatDateTime(booking.startAt));
    row("Ends", formatClock(booking.endAt));
    row("Status", titleCase(booking.status));
    y += 10;

    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text("Total", margin, y);
    doc.text(money(booking.price), width - margin, y, { align: "right" });
    y += 12;
    doc.line(margin, y, width - margin, y);

    y += 30;
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Manage this booking", margin, y);
    y += 15;
    doc.setFont("helvetica", "normal").setFontSize(9);
    const linkLines: string[] = doc.splitTextToSize(
        manageUrl,
        width - margin * 2
    );
    doc.text(linkLines, margin, y);
    y += linkLines.length * 12 + 4;
    doc.text(
        "Keep this private link to cancel or request a reschedule.",
        margin,
        y
    );

    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
        "System-generated receipt. No signature required.",
        width / 2,
        height - 40,
        { align: "center" }
    );
    doc.setTextColor(0);

    doc.save(`OR-${booking.reference}.pdf`);
};
