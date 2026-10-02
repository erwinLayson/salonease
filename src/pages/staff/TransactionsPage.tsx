import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatDateTime, peso, dateInDays } from "../../lib/utils";

import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";

import type { PaymentMethod, PaymentStatus, TransactionDetail } from "../../types";

// ── Constants ─────────────────────────────────────────────────────────

const PAYMENT_METHODS: { value: PaymentMethod | ""; label: string }[] = [
    { value: "", label: "All methods" },
    { value: "cash", label: "Cash" },
    { value: "gcash", label: "GCash" },
    { value: "card", label: "Card" },
    { value: "other", label: "Other" },
];

const PAYMENT_STATUSES: { value: PaymentStatus | ""; label: string }[] = [
    { value: "", label: "All statuses" },
    { value: "paid", label: "Paid" },
    { value: "unpaid", label: "Unpaid" },
    { value: "waived", label: "Waived" },
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

// ── Main Page ─────────────────────────────────────────────────────────

/**
 * Read-only billing history for the appointments this staff member
 * completed. Editing (waivers, notes) stays with the
 * owner on the Transactions page.
 */
export default function TransactionsPage() {
    // Filters
    const [from, setFrom] = useState(dateInDays(-30));
    const [to, setTo] = useState(dateInDays(0));
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
    const [search, setSearch] = useState("");

    // Data
    const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
    const [loading, setLoading] = useState(false);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<{ data: TransactionDetail[] }>(
                "/staff/transactions",
                {
                    params: {
                        from,
                        to,
                        ...(paymentMethod ? { paymentMethod } : {}),
                        ...(paymentStatus ? { paymentStatus } : {}),
                        ...(search ? { search } : {}),
                    },
                }
            );
            setTransactions(res.data.data);
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setLoading(false);
        }
    }, [from, to, paymentMethod, paymentStatus, search]);

    useEffect(() => {
        void reload();
    }, [reload]);

    // Derived totals for the visible set
    const visibleTotal = transactions.reduce((sum, t) => sum + t.total, 0);
    const paidTotal = transactions
        .filter((t) => t.paymentStatus === "paid")
        .reduce((sum, t) => sum + t.total, 0);
    const unpaidTotal = transactions
        .filter((t) => t.paymentStatus === "unpaid")
        .reduce((sum, t) => sum + t.total, 0);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-xl font-semibold tracking-tight">
                    Transaction history
                </h1>
                <p className="mt-1 text-sm text-muted">
                    Billing records for appointments you have completed.
                </p>
            </header>

            {/* Totals for the filtered set */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Card>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        Filtered total
                    </p>
                    <p className="mt-1 text-2xl font-bold text-charcoal">
                        {peso(visibleTotal)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                        {transactions.length} records
                    </p>
                </Card>
                <Card>
                    <p className="text-xs font-medium uppercase tracking-wide text-success">
                        Paid
                    </p>
                    <p className="mt-1 text-2xl font-bold text-success">
                        {peso(paidTotal)}
                    </p>
                </Card>
                <Card>
                    <p className="text-xs font-medium uppercase tracking-wide text-warning">
                        Unpaid
                    </p>
                    <p className="mt-1 text-2xl font-bold text-warning">
                        {peso(unpaidTotal)}
                    </p>
                </Card>
            </div>

            {/* Filters */}
            <Card title="Filters">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    <Field label="From" type="date" value={from} onChange={setFrom} />
                    <Field label="To" type="date" value={to} onChange={setTo} />
                    <Select
                        label="Method"
                        value={paymentMethod}
                        onChange={(value) =>
                            setPaymentMethod(value as PaymentMethod | "")
                        }
                        options={PAYMENT_METHODS}
                    />
                    <Select
                        label="Payment Status"
                        value={paymentStatus}
                        onChange={(value) =>
                            setPaymentStatus(value as PaymentStatus | "")
                        }
                        options={PAYMENT_STATUSES}
                    />
                    <Field
                        label="Search"
                        type="text"
                        placeholder="Ref / name…"
                        value={search}
                        onChange={setSearch}
                    />
                </div>
            </Card>

            {/* Table */}
            <Card title="Transactions">
                {loading ? (
                    <p className="py-4 text-center text-sm text-muted">Loading…</p>
                ) : transactions.length === 0 ? (
                    <div className="py-10 text-center">
                        <span
                            aria-hidden
                            className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-charcoal/5 text-muted"
                        >
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
                                <line x1="8" y1="8" x2="16" y2="8" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                        </span>
                        <p className="mt-3 text-sm font-medium">
                            No transactions found
                        </p>
                        <p className="mt-1 text-xs text-muted">
                            A billing record is created automatically when an
                            appointment is marked as completed.
                        </p>
                    </div>
                ) : (
                    <div className="-mx-4 -my-4 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    {[
                                        "Reference",
                                        "Date",
                                        "Customer",
                                        "Service",
                                        "Subtotal",
                                        "Total",
                                        "Method",
                                        "Status",
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((txn) => (
                                    <tr
                                        key={txn.id}
                                        className="border-b border-border/50 transition-colors hover:bg-charcoal/5"
                                    >
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-primary-dark">
                                            {txn.reference}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-charcoal">
                                            {formatDateTime(txn.completedAt)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-charcoal">
                                            {txn.customer.name}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-charcoal">
                                            {txn.service.name}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-charcoal">
                                            {peso(txn.subtotal)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-charcoal">
                                            {peso(txn.total)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <span className="inline-flex items-center rounded bg-charcoal/5 px-2 py-0.5 text-xs font-medium text-charcoal">
                                                {METHOD_LABELS[txn.paymentMethod]}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <span
                                                className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[txn.paymentStatus]}`}
                                            >
                                                {txn.paymentStatus.charAt(0).toUpperCase()}
                                                {txn.paymentStatus.slice(1)}
                                            </span>
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
