import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { toast } from "../../lib/toast";
import { formatDateTime, peso, dateInDays } from "../../lib/utils";

import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";

import type {
    TransactionDetail,
    PaymentMethod,
    PaymentStatus,
    OwnerStaff,
    DashboardSummary,
} from "../../types";

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Edit Modal ────────────────────────────────────────────────────────────────

interface EditForm {
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    notes: string;
}

function EditTransactionModal({
    txn,
    onClose,
    onSaved,
}: {
    txn: TransactionDetail;
    onClose: () => void;
    onSaved: (updated: TransactionDetail) => void;
}) {
    const [form, setForm] = useState<EditForm>({
        paymentMethod: txn.paymentMethod,
        paymentStatus: txn.paymentStatus,
        notes: txn.notes ?? "",
    });
    const [busy, setBusy] = useState(false);

    const handleSave = async () => {
        setBusy(true);
        try {
            const res = await api.patch<{ data: TransactionDetail }>(
                `/owner/transactions/${txn.id}`,
                {
                    paymentMethod: form.paymentMethod,
                    paymentStatus: form.paymentStatus,
                    notes: form.notes || null,
                }
            );
            toast.success("Transaction updated.");
            onSaved(res.data.data);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title={`Edit Transaction — ${txn.reference}`} onClose={onClose}>
            <div className="space-y-4">
                {/* Summary strip */}
                <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Customer</span>
                        <span className="font-medium">{txn.customer.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Service</span>
                        <span className="font-medium">{txn.service.name}</span>
                    </div>
                    <div className="flex justify-between border-t border-purple-200 dark:border-purple-700 pt-1 mt-1">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold text-purple-700 dark:text-purple-300">
                            {peso(txn.subtotal)}
                        </span>
                    </div>
                </div>

                <Select
                    label="Payment Method"
                    value={form.paymentMethod}
                    onChange={(value) =>
                        setForm((f) => ({
                            ...f,
                            paymentMethod: value as PaymentMethod,
                        }))
                    }
                    options={PAYMENT_METHODS.filter((m) => m.value !== "")}
                />

                <Select
                    label="Payment Status"
                    value={form.paymentStatus}
                    onChange={(value) =>
                        setForm((f) => ({
                            ...f,
                            paymentStatus: value as PaymentStatus,
                        }))
                    }
                    options={PAYMENT_STATUSES.filter((s) => s.value !== "")}
                />

                <div className="block text-sm">
                    <span className="mb-1.5 block font-medium text-charcoal">
                        Notes (optional)
                    </span>
                    <textarea
                        rows={3}
                        value={form.notes}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, notes: e.target.value }))
                        }
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/40"
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        id="txn-cancel-btn"
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        id="txn-save-btn"
                        type="button"
                        disabled={busy}
                        onClick={handleSave}
                        className="px-4 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                        {busy ? "Saving…" : "Save changes"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
    // Filters
    const [from, setFrom] = useState(dateInDays(-30));
    const [to, setTo] = useState(dateInDays(0));
    const [staffId, setStaffId] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
    const [search, setSearch] = useState("");

    // Data
    const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
    const [staff, setStaff] = useState<OwnerStaff[]>([]);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState<TransactionDetail | null>(null);

    // Load staff list once
    useEffect(() => {
        void api
            .get<{ data: OwnerStaff[] }>("/owner/staff")
            .then((r) => setStaff(r.data.data))
            .catch(() => {});
    }, []);

    // Load today's summary once
    useEffect(() => {
        void api
            .get<{ data: DashboardSummary }>("/owner/dashboard/summary")
            .then((r) => setSummary(r.data.data))
            .catch(() => {});
    }, []);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<{ data: TransactionDetail[] }>("/owner/transactions", {
                params: {
                    from,
                    to,
                    ...(staffId ? { staffId } : {}),
                    ...(paymentMethod ? { paymentMethod } : {}),
                    ...(paymentStatus ? { paymentStatus } : {}),
                    ...(search ? { search } : {}),
                },
            });
            setTransactions(res.data.data);
        } catch {
            // toast via interceptor
        } finally {
            setLoading(false);
        }
    }, [from, to, staffId, paymentMethod, paymentStatus, search]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const handleSaved = (updated: TransactionDetail) => {
        setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setEditing(null);
    };

    // Derived totals for the visible set
    const visibleTotal = transactions.reduce((sum, t) => sum + t.total, 0);
    const paidTotal = transactions
        .filter((t) => t.paymentStatus === "paid")
        .reduce((sum, t) => sum + t.total, 0);
    const unpaidTotal = transactions
        .filter((t) => t.paymentStatus === "unpaid")
        .reduce((sum, t) => sum + t.total, 0);

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Transactions
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Billing records created when appointments are completed.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Today's Revenue
                    </p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                        {summary ? peso(summary.total) : "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {summary ? `${summary.count} completed` : "loading…"}
                    </p>
                </Card>
                <Card>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Filtered Total
                    </p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                        {peso(visibleTotal)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{transactions.length} records</p>
                </Card>
                <Card>
                    <p className="text-xs font-medium text-green-600 uppercase tracking-wide">
                        Paid
                    </p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">
                        {peso(paidTotal)}
                    </p>
                </Card>
                <Card>
                    <p className="text-xs font-medium text-yellow-600 uppercase tracking-wide">
                        Unpaid
                    </p>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mt-1">
                        {peso(unpaidTotal)}
                    </p>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Field
                        label="From"
                        type="date"
                        value={from}
                        onChange={setFrom}
                    />
                    <Field
                        label="To"
                        type="date"
                        value={to}
                        onChange={setTo}
                    />
                    <Select
                        label="Staff"
                        value={staffId}
                        onChange={setStaffId}
                        options={[
                            { value: "", label: "All staff" },
                            ...staff.map((s) => ({
                                value: String(s.id),
                                label: `${s.first_name} ${s.last_name}`,
                            })),
                        ]}
                    />
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
            <Card>
                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading…</div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 space-y-2">
                        <svg
                            className="mx-auto w-10 h-10 opacity-30"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"
                            />
                            <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" />
                            <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" />
                        </svg>
                        <p className="text-sm">No transactions found for the selected filters.</p>
                        <p className="text-xs">
                            Transactions are created automatically when an appointment is marked as{" "}
                            <strong>Completed</strong>.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-4 -my-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    {[
                                        "Reference",
                                        "Date",
                                        "Customer",
                                        "Service",
                                        "Staff",
                                        "Subtotal",
                                        "Total",
                                        "Method",
                                        "Status",
                                        "",
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
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
                                        className="border-b border-gray-50 dark:border-gray-800 hover:bg-purple-50/40 dark:hover:bg-purple-900/10 transition-colors"
                                    >
                                        <td className="px-4 py-3 font-mono text-xs text-purple-700 dark:text-purple-300 whitespace-nowrap">
                                            {txn.reference}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            {formatDateTime(txn.completedAt)}
                                        </td>
                                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                                            {txn.customer.name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            {txn.service.name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            {txn.staff.name}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            {peso(txn.subtotal)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                            {peso(txn.total)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                                {METHOD_LABELS[txn.paymentMethod]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[txn.paymentStatus]}`}
                                            >
                                                {txn.paymentStatus.charAt(0).toUpperCase()}
                                                {txn.paymentStatus.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <button
                                                id={`txn-edit-${txn.id}`}
                                                type="button"
                                                onClick={() => setEditing(txn)}
                                                className="text-xs px-3 py-1 rounded-lg border border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Edit modal */}
            {editing && (
                <EditTransactionModal
                    txn={editing}
                    onClose={() => setEditing(null)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}
