import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import { dateInDays, peso, formatDateTime } from "../../lib/utils";
import { downloadCommissionStatement } from "../../lib/commissionStatement";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

import type { CommissionEntry, CommissionPayout, PayoutStatus } from "../../types";

const STATUS_STYLES: Record<PayoutStatus, string> = {
    draft: "bg-info-bg text-info",
    approved: "bg-warning-bg text-warning",
    paid: "bg-success-bg text-success",
    void: "bg-charcoal/10 text-charcoal",
};

export default function StaffCommissionsPage() {
    const [entries, setEntries] = useState<CommissionEntry[]>([]);
    const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
    const [loading, setLoading] = useState(true);

    const [from, setFrom] = useState(dateInDays(0));
    const [to, setTo] = useState(dateInDays(0));

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const batch = await Promise.all([
                api.get<{ data: CommissionEntry[] }>(
                    "/staff/commissions",
                    { params: { from, to } }
                ),
                api.get<{ data: CommissionPayout[] }>("/staff/commission-payouts"),
            ]);
            setEntries(batch[0].data.data);
            setPayouts(batch[1].data.data);
        } catch {
            setEntries([]);
            setPayouts([]);
        } finally {
            setLoading(false);
        }
    }, [from, to]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const total = entries.reduce((sum, entry) => sum + entry.commissionAmount, 0);
    const served = entries.filter((entry) => entry.status === "paid").length;

    return (
        <div className="grid gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        My commissions
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                        Your accrued and settled commission, and the payouts you have
                        received.
                    </p>
                </div>
                <div className="w-48">
                    <div className="flex gap-3">
                        <input
                            type="date"
                            value={from}
                            onChange={(event) => setFrom(event.target.value)}
                            className="min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition hover:border-muted focus:border-primary focus:ring-2 focus:ring-primary/40"
                        />
                        <input
                            type="date"
                            value={to}
                            onChange={(event) => setTo(event.target.value)}
                            className="min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition hover:border-muted focus:border-primary focus:ring-2 focus:ring-primary/40"
                        />
                    </div>
                </div>
            </header>

            <div className="grid gap-3 lg:grid-cols-4">
                <Card>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Accrued
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-charcoal">
                        {peso(total)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                        {entries.length} entr
                        {entries.length === 1 ? "y" : "ies"} in range
                    </p>
                </Card>
                <Card>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Served
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-charcoal">
                        {served}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                        commission entries already settled
                    </p>
                </Card>
                <Card>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Pending payout
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-charcoal">
                        {peso(
                            payouts
                                .filter((payout) => payout.status === "approved")
                                .reduce((sum, payout) => sum + payout.totalAmount, 0)
                        )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                        approved payouts not yet paid
                    </p>
                </Card>
                <Card>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Paid
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-charcoal">
                        {peso(
                            payouts
                                .filter((payout) => payout.status === "paid")
                                .reduce((sum, payout) => sum + payout.totalAmount, 0)
                        )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                        total received
                    </p>
                </Card>
            </div>

            <Card title="Commission entries">
                {loading && !entries.length && (
                    <p className="py-4 text-center text-sm text-muted">Loading…</p>
                )}

                {!loading && !entries.length && (
                    <div className="py-8 text-center">
                        <p className="text-sm font-medium text-charcoal">
                            No commission entries in this range.
                        </p>
                        <p className="mt-1 text-xs text-muted">
                            Entries accrue when you complete an appointment with a matching
                            commission rule.
                        </p>
                    </div>
                )}

                {entries.length > 0 && (
                    <div className="-mx-5 overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead>
                                <tr className="border-y border-border text-xs uppercase tracking-wide text-muted">
                                    <th className="px-5 py-2 font-semibold">Date</th>
                                    <th className="px-3 py-2 font-semibold">Source</th>
                                    <th className="px-3 py-2 font-semibold">Base</th>
                                    <th className="px-3 py-2 font-semibold">Rate</th>
                                    <th className="px-3 py-2 font-semibold">Commission</th>
                                    <th className="px-3 py-2 font-semibold">Status</th>
                                    <th className="px-5 py-2 font-semibold text-right">
                                        Payout
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => (
                                    <tr
                                        key={entry.id}
                                        className="border-b border-border last:border-0 hover:bg-charcoal/[0.02]"
                                    >
                                        <td className="px-5 py-3 text-xs text-muted">
                                            {String(entry.accruedAt).slice(0, 10)}
                                        </td>
                                        <td className="px-3 py-3">
                                            {entry.sourceType === "event"
                                                ? entry.eventReference ??
                                                  `Event #${entry.sourceId}`
                                                : entry.transactionReference ??
                                                  `Appointment #${entry.sourceId}`}
                                        </td>
                                        <td className="px-3 py-3 text-muted">
                                            {peso(entry.baseAmount)}
                                        </td>
                                        <td className="px-3 py-3 text-muted">
                                            {entry.rateType === "percent"
                                                ? `${entry.rateValue}%`
                                                : peso(entry.rateValue)}
                                        </td>
                                        <td className="px-3 py-3 font-medium text-charcoal">
                                            {peso(entry.commissionAmount)}
                                        </td>
                                        <td className="px-3 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    {
                                                        accrued: "bg-warning-bg text-warning",
                                                        approved: "bg-warning-bg text-warning",
                                                        paid: "bg-success-bg text-success",
                                                        void: "bg-charcoal/10 text-charcoal",
                                                    }[entry.status]
                                                }`}
                                            >
                                                {entry.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right text-sm text-muted">
                                            {entry.payoutId !== null ? `#${entry.payoutId}` : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card title="Payouts">
                {loading && !payouts.length && (
                    <p className="py-4 text-center text-sm text-muted">Loading…</p>
                )}

                {!loading && !payouts.length && (
                    <div className="py-8 text-center">
                        <p className="text-sm font-medium text-charcoal">
                            No payouts in this range.
                        </p>
                    </div>
                )}

                {payouts.length > 0 && (
                    <div className="-mx-5 overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead>
                                <tr className="border-y border-border text-xs uppercase tracking-wide text-muted">
                                    <th className="px-5 py-2 font-semibold">Payout</th>
                                    <th className="px-3 py-2 font-semibold">Period</th>
                                    <th className="px-3 py-2 font-semibold">Total</th>
                                    <th className="px-3 py-2 font-semibold">Status</th>
                                    <th className="px-3 py-2 font-semibold">Paid</th>
                                    <th className="px-5 py-2 text-right font-semibold">
                                        Statement
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {payouts.map((payout) => (
                                    <tr
                                        key={payout.id}
                                        className="border-b border-border last:border-0 hover:bg-charcoal/[0.02]"
                                    >
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-charcoal">
                                                Payout #${payout.id}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3 text-xs text-muted">
                                            {payout.periodStart} → {payout.periodEnd}
                                        </td>
                                        <td className="px-3 py-3 font-medium text-charcoal">
                                            {peso(payout.totalAmount)}
                                        </td>
                                        <td className="px-3 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[payout.status]}`}
                                            >
                                                {payout.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-xs text-muted">
                                            {payout.paidAt
                                                ? formatDateTime(payout.paidAt)
                                                : "—"}
                                        </td>
                                        <td className="px-5 py-3">
                                            {payout.status === "paid" && (
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => void downloadCommissionStatement(payout, entries.filter((entry) => entry.payoutId === payout.id))}
                                                >
                                                    Download
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
