import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "../lib/toast";

// UI components
import { Select } from "./ui/Select";

// Types
import type { PaymentMethod, PaymentStatus, TransactionDetail } from "../types";

// Utilities
import { peso } from "../lib/utils";

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
    { value: "cash", label: "Cash" },
    { value: "gcash", label: "GCash" },
    { value: "card", label: "Card" },
    { value: "other", label: "Other" },
];

const METHOD_LABELS: Record<PaymentMethod, string> = {
    cash: "Cash",
    gcash: "GCash",
    card: "Card",
    other: "Other",
};

const STATUS_STYLES: Record<PaymentStatus, string> = {
    paid: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    unpaid:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    waived: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
};

/**
 * Payment controls for one completed appointment.
 *
 * Loads the billing transaction the completion created and lets
 * staff record how the customer paid (method + paid/unpaid).
 * Notes and waivers stay with the owner on the
 * Transactions page.
 *
 * `onSaved` fires after a successful save so the parent can
 * refresh (e.g. drop a now-paid appointment from the calendar).
 */
export function PaymentControls(props: {
    appointmentId: number;
    onSaved?: () => void;
}) {
    const [txn, setTxn] = useState<TransactionDetail | null | undefined>(
        undefined
    );
    const [method, setMethod] = useState<PaymentMethod>("cash");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const res = await api.get<{ data: TransactionDetail | null }>(
                    `/staff/appointments/${props.appointmentId}/transaction`,
                    { skipErrorToast: true }
                );
                if (cancelled) {
                    return;
                }
                setTxn(res.data.data);
                setMethod(res.data.data?.paymentMethod ?? "cash");
            } catch {
                if (!cancelled) {
                    setTxn(null);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [props.appointmentId]);

    const save = async (paymentStatus: "paid" | "unpaid"): Promise<void> => {
        if (!txn) {
            return;
        }
        setBusy(true);
        try {
            const res = await api.patch<{ data: TransactionDetail }>(
                `/staff/appointments/${props.appointmentId}/transaction`,
                { paymentMethod: method, paymentStatus }
            );
            setTxn(res.data.data);
            props.onSaved?.();
            toast.success(
                paymentStatus === "paid"
                    ? `${res.data.data.reference} marked as paid.`
                    : `${res.data.data.reference} marked as unpaid.`
            );
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setBusy(false);
        }
    };

    if (txn === undefined) {
        return <p className="text-xs text-muted">Loading payment…</p>;
    }

    if (txn === null) {
        return (
            <p className="text-xs text-muted">
                No billing record yet — the owner can add one from Transactions.
            </p>
        );
    }

    if (txn.paymentStatus !== "unpaid") {
        return (
            <div className="flex flex-wrap items-center gap-2">
                <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[txn.paymentStatus]}`}
                >
                    {txn.paymentStatus === "paid" ? "Paid" : "Waived"} ·{" "}
                    {METHOD_LABELS[txn.paymentMethod]}
                </span>
                <span className="text-sm font-semibold text-charcoal">
                    {peso(txn.total)}
                </span>
                {txn.paymentStatus === "paid" && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void save("unpaid")}
                        className="min-h-11 rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors hover:border-primary hover:bg-primary-light/30 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Mark unpaid
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
                <Select
                    label="Payment method"
                    value={method}
                    onChange={(value) => setMethod(value as PaymentMethod)}
                    options={PAYMENT_METHODS}
                />
            </div>
            <button
                type="button"
                disabled={busy}
                onClick={() => void save("paid")}
                className="min-h-11 rounded-lg bg-primary-dark px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-press disabled:opacity-50"
            >
                {busy ? "Saving…" : `Mark as paid · ${peso(txn.total)}`}
            </button>
        </div>
    );
}
