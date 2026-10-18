import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import { toast } from "../../lib/toast";
import { dateInDays, formatDateTime, peso } from "../../lib/utils";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";

import type { ClosureStatus, DailyTotals, DaySummary } from "../../types";

const STATUS_STYLES: Record<ClosureStatus, string> = {
    open: "bg-info-bg text-info",
    closed: "bg-success-bg text-success",
    reopened: "bg-warning-bg text-warning",
};

const STATUS_LABELS: Record<ClosureStatus, string> = {
    open: "Open",
    closed: "Closed",
    reopened: "Reopened",
};

const EMPTY_TOTALS: DailyTotals = {
    transactionCount: 0,
    grossSales: 0,
    paidTotal: 0,
    unpaidTotal: 0,
    waivedTotal: 0,
    cashTotal: 0,
    gcashTotal: 0,
    cardTotal: 0,
    otherTotal: 0,
    commissionTotal: 0,
    inventoryCostTotal: 0,
};

const Metric = (props: { label: string; value: string; hint?: string }) => (
    <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {props.label}
        </p>
        <p className="mt-1 text-lg font-semibold tracking-tight text-charcoal">
            {props.value}
        </p>
        {props.hint && <p className="mt-0.5 text-xs text-muted">{props.hint}</p>}
    </div>
);

/** Owner end-of-day close: totals snapshot, cash count/variance, reopen audit. */
export default function DailyClosePage() {
    const [date, setDate] = useState(dateInDays(0));
    const [summary, setSummary] = useState<DaySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [cashCounted, setCashCounted] = useState("");
    const [notes, setNotes] = useState("");
    const [reopenReason, setReopenReason] = useState("");
    const [busy, setBusy] = useState(false);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<{ data: DaySummary }>(
                `/owner/closures/${date}`
            );
            setSummary(res.data.data);
            setCashCounted(
                res.data.data.cashCounted === null
                    ? ""
                    : String(res.data.data.cashCounted)
            );
            setNotes(res.data.data.notes ?? "");
        } catch {
            // toast via interceptor
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const handleClose = async () => {
        if (cashCounted !== "" && Number.isNaN(Number(cashCounted))) {
            toast.error("Cash counted must be a number.");
            return;
        }
        setBusy(true);
        try {
            await api.post("/owner/closures", {
                date,
                cashCounted: cashCounted === "" ? null : Number(cashCounted),
                notes: notes || null,
            });
            toast.success(`Business day ${date} closed.`);
            await reload();
        } finally {
            setBusy(false);
        }
    };

    const handleReopen = async () => {
        if (!reopenReason.trim()) {
            toast.error("A reason is required to reopen a closed day.");
            return;
        }
        setBusy(true);
        try {
            await api.post(`/owner/closures/${date}/reopen`, {
                reason: reopenReason,
            });
            toast.success(`Business day ${date} reopened.`);
            setReopenReason("");
            await reload();
        } finally {
            setBusy(false);
        }
    };

    const live = summary?.live ?? EMPTY_TOTALS;
    const isClosed = summary?.status === "closed";
    const stored = summary ?? null;
    const totals: DailyTotals = isClosed || summary?.status === "reopened" ? summary! : live;

    return (
        <div className="grid gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Daily close
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                        Reconcile the day's sales and lock the ledger.
                    </p>
                </div>
                <div className="w-48">
                    <Field
                        label="Business date"
                        type="date"
                        value={date}
                        onChange={setDate}
                    />
                </div>
            </header>

            {loading && !summary && (
                <p className="py-4 text-center text-sm text-muted">Loading…</p>
            )}

            {summary && (
                <>
                    <Card>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-charcoal">
                                    {summary.businessDate}
                                </p>
                                <p className="mt-0.5 text-xs text-muted">
                                    {totals.transactionCount} transaction
                                    {totals.transactionCount === 1 ? "" : "s"}
                                </p>
                            </div>
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[summary.status]}`}
                            >
                                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                                {STATUS_LABELS[summary.status]}
                            </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Metric label="Gross sales" value={peso(totals.grossSales)} />
                            <Metric label="Paid" value={peso(totals.paidTotal)} />
                            <Metric label="Unpaid" value={peso(totals.unpaidTotal)} />
                            <Metric label="Waived" value={peso(totals.waivedTotal)} />
                            <Metric label="Cash" value={peso(totals.cashTotal)} />
                            <Metric label="GCash" value={peso(totals.gcashTotal)} />
                            <Metric label="Card" value={peso(totals.cardTotal)} />
                            <Metric label="Other" value={peso(totals.otherTotal)} />
                            <Metric
                                label="Commission"
                                value={peso(totals.commissionTotal)}
                            />
                            <Metric
                                label="Inventory cost"
                                value={peso(totals.inventoryCostTotal)}
                            />
                            {stored && (
                                <>
                                    <Metric
                                        label="Cash counted"
                                        value={
                                            stored.cashCounted === null
                                                ? "—"
                                                : peso(stored.cashCounted)
                                        }
                                    />
                                    <Metric
                                        label="Cash variance"
                                        value={
                                            stored.cashVariance === null
                                                ? "—"
                                                : peso(stored.cashVariance)
                                        }
                                        hint="counted − cash sales"
                                    />
                                </>
                            )}
                        </div>

                        {summary.status !== "open" && (
                            <p className="mt-4 text-xs text-muted">
                                Closed {summary.closedAt ? formatDateTime(summary.closedAt) : "—"}
                                {summary.reopenedAt && (
                                    <>
                                        {" · "}Reopened {formatDateTime(summary.reopenedAt)}
                                        {summary.reopenReason
                                            ? ` — ${summary.reopenReason}`
                                            : ""}
                                    </>
                                )}
                            </p>
                        )}

                        {summary.notes && (
                            <p className="mt-1 text-xs text-muted">Note: {summary.notes}</p>
                        )}
                    </Card>

                    {summary.status === "open" && (
                        <Card title="Close this business day">
                            <p className="mb-4 text-sm text-muted">
                                A close snapshots the totals above. Transaction edits and
                                new completions are blocked until the day is reopened.
                            </p>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Cash counted (optional)"
                                    type="number"
                                    value={cashCounted}
                                    onChange={setCashCounted}
                                    placeholder={String(live.cashTotal)}
                                />
                                <Field
                                    label="Notes (optional)"
                                    value={notes}
                                    onChange={setNotes}
                                    placeholder="e.g. handover note"
                                />
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button loading={busy} onClick={() => void handleClose()}>
                                    Close business day
                                </Button>
                            </div>
                        </Card>
                    )}

                    {isClosed && (
                        <Card title="Reopen with a reason">
                            <p className="mb-4 text-sm text-muted">
                                Reopening is recorded with your account and the reason below.
                                The totals stay as a snapshot until you close the day again.
                            </p>
                            <Field
                                label="Reason"
                                value={reopenReason}
                                onChange={setReopenReason}
                                placeholder="e.g. late cash payment correction"
                            />
                            <div className="mt-4 flex justify-end">
                                <Button
                                    variant="secondary"
                                    loading={busy}
                                    onClick={() => void handleReopen()}
                                >
                                    Reopen business day
                                </Button>
                            </div>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
