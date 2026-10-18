import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import { toast } from "../../lib/toast";
import { dateInDays, formatDateTime, peso } from "../../lib/utils";
import { downloadCommissionStatement } from "../../lib/commissionStatement";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";

import type {
    CommissionEntry,
    CommissionPayout,
    OwnerStaff,
    PayoutStatus,
    PaymentMethod,
} from "../../types";

const STATUS_STYLES: Record<PayoutStatus, string> = {
    draft: "bg-info-bg text-info",
    approved: "bg-warning-bg text-warning",
    paid: "bg-success-bg text-success",
    void: "bg-charcoal/10 text-charcoal",
};

const PAYMENT_OPTIONS = [
    { value: "cash", label: "Cash" },
    { value: "gcash", label: "GCash" },
    { value: "card", label: "Card" },
    { value: "other", label: "Other" },
];

const firstOfMonth = (): string => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
};

export default function CommissionPayoutsPage() {
    const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
    const [staff, setStaff] = useState<OwnerStaff[]>([]);
    const [loading, setLoading] = useState(true);

    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        staffId: "",
        periodStart: firstOfMonth(),
        periodEnd: dateInDays(0),
        notes: "",
    });
    const [draftEntries, setDraftEntries] = useState<CommissionEntry[]>([]);
    const [calculating, setCalculating] = useState(false);
    const [busy, setBusy] = useState(false);

    const [paying, setPaying] = useState<CommissionPayout | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
    const [voiding, setVoiding] = useState<CommissionPayout | null>(null);
    const [exporting, setExporting] = useState<number | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<{ data: CommissionPayout[] }>(
                "/owner/commission-payouts"
            );
            setPayouts(res.data.data);
        } catch {
            // toast via interceptor
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
        void api
            .get<{ data: OwnerStaff[] }>("/owner/staff", {
                params: { includeInactive: true },
            })
            .then((res) => setStaff(res.data.data))
            .catch(() => {});
    }, [reload]);

    const calculate = async () => {
        if (!form.staffId) {
            toast.error("Choose a staff member.");
            return;
        }
        setCalculating(true);
        try {
            const res = await api.get<{ data: CommissionEntry[] }>(
                "/owner/commissions/entries",
                {
                    params: {
                        staffId: form.staffId,
                        from: form.periodStart,
                        to: form.periodEnd,
                        status: "accrued",
                    },
                }
            );
            setDraftEntries(res.data.data);
        } finally {
            setCalculating(false);
        }
    };

    const create = async () => {
        if (!form.staffId) {
            toast.error("Choose a staff member.");
            return;
        }
        if (form.periodEnd < form.periodStart) {
            toast.error("The period end must be on or after the start.");
            return;
        }
        setBusy(true);
        try {
            await api.post("/owner/commission-payouts", {
                staffId: Number(form.staffId),
                periodStart: form.periodStart,
                periodEnd: form.periodEnd,
                notes: form.notes || null,
            });
            toast.success("Payout draft created.");
            setCreating(false);
            setDraftEntries([]);
            await reload();
        } finally {
            setBusy(false);
        }
    };

    const changeStatus = async (
        payout: CommissionPayout,
        status: "approved" | "paid" | "void",
        method?: PaymentMethod
    ) => {
        setBusy(true);
        try {
            await api.patch(`/owner/commission-payouts/${payout.id}/status`, {
                status,
                paymentMethod: method ?? null,
            });
            toast.success(`Payout #${payout.id} marked as ${status}.`);
            setPaying(null);
            setVoiding(null);
            await reload();
        } finally {
            setBusy(false);
        }
    };

    const exportStatement = async (payout: CommissionPayout) => {
        setExporting(payout.id);
        try {
            const res = await api.get<{ data: CommissionEntry[] }>(
                "/owner/commissions/entries",
                {
                    params: {
                        staffId: payout.staffId,
                        from: payout.periodStart,
                        to: payout.periodEnd,
                    },
                }
            );
            downloadCommissionStatement(payout, res.data.data);
            toast.success("Commission statement downloaded.");
        } finally {
            setExporting(null);
        }
    };

    const draftTotal = draftEntries.reduce(
        (sum, entry) => sum + entry.commissionAmount,
        0
    );

    return (
        <div className="grid gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Commission payouts
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                        Draft → approved → paid. Only paid entries are settled.
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setForm({
                            staffId: "",
                            periodStart: firstOfMonth(),
                            periodEnd: dateInDays(0),
                            notes: "",
                        });
                        setDraftEntries([]);
                        setCreating(true);
                    }}
                >
                    New payout
                </Button>
            </header>

            <Card title="Payouts">
                {loading && payouts.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted">Loading…</p>
                )}

                {!loading && payouts.length === 0 && (
                    <div className="py-8 text-center">
                        <p className="text-sm font-medium text-charcoal">
                            No payouts yet.
                        </p>
                        <p className="mt-1 text-xs text-muted">
                            Create one from accrued commission entries for a staff member
                            and period.
                        </p>
                    </div>
                )}

                {payouts.length > 0 && (
                    <div className="-mx-5 overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead>
                                <tr className="border-y border-border text-xs uppercase tracking-wide text-muted">
                                    <th className="px-5 py-2 font-semibold">Staff</th>
                                    <th className="px-3 py-2 font-semibold">Period</th>
                                    <th className="px-3 py-2 font-semibold">Total</th>
                                    <th className="px-3 py-2 font-semibold">Status</th>
                                    <th className="px-3 py-2 font-semibold">Paid</th>
                                    <th className="px-5 py-2 text-right font-semibold">
                                        Actions
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
                                                {payout.staffName}
                                            </p>
                                            {payout.notes && (
                                                <p className="mt-0.5 text-xs text-muted">
                                                    {payout.notes}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-muted">
                                            {payout.periodStart} → {payout.periodEnd}
                                        </td>
                                        <td className="px-3 py-3 font-medium">
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
                                            {payout.paymentMethod
                                                ? ` · ${payout.paymentMethod}`
                                                : ""}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    loading={exporting === payout.id}
                                                    onClick={() => void exportStatement(payout)}
                                                >
                                                    Statement
                                                </Button>
                                                {payout.status === "draft" && (
                                                    <Button
                                                        variant="secondary"
                                                        disabled={busy}
                                                        onClick={() =>
                                                            void changeStatus(payout, "approved")
                                                        }
                                                    >
                                                        Approve
                                                    </Button>
                                                )}
                                                {payout.status === "approved" && (
                                                    <Button
                                                        disabled={busy}
                                                        onClick={() => {
                                                            setPaymentMethod("cash");
                                                            setPaying(payout);
                                                        }}
                                                    >
                                                        Mark paid
                                                    </Button>
                                                )}
                                                {payout.status !== "paid" &&
                                                    payout.status !== "void" && (
                                                        <Button
                                                            variant="danger"
                                                            disabled={busy}
                                                            onClick={() => setVoiding(payout)}
                                                        >
                                                            Void
                                                        </Button>
                                                    )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {creating && (
                <Modal title="New commission payout" onClose={() => setCreating(false)} wide>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                            label="Staff"
                            value={form.staffId}
                            onChange={(value) => {
                                setForm((current) => ({ ...current, staffId: value }));
                                setDraftEntries([]);
                            }}
                            options={[
                                { value: "", label: "Choose staff" },
                                ...staff.map((row) => ({
                                    value: String(row.id),
                                    label: `${row.first_name} ${row.last_name}`,
                                })),
                            ]}
                        />
                        <div className="hidden sm:block" />
                        <Field
                            label="Period start"
                            type="date"
                            value={form.periodStart}
                            onChange={(value) =>
                                setForm((current) => ({
                                    ...current,
                                    periodStart: value,
                                }))
                            }
                        />
                        <Field
                            label="Period end"
                            type="date"
                            value={form.periodEnd}
                            onChange={(value) =>
                                setForm((current) => ({ ...current, periodEnd: value }))
                            }
                        />
                        <Field
                            label="Notes (optional)"
                            value={form.notes}
                            onChange={(value) =>
                                setForm((current) => ({ ...current, notes: value }))
                            }
                        />
                    </div>

                    <div className="mt-4 rounded-xl border border-border bg-charcoal/[0.02] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-charcoal">
                                    {draftEntries.length} accrued entr
                                    {draftEntries.length === 1 ? "y" : "ies"}
                                </p>
                                <p className="mt-0.5 text-xs text-muted">
                                    Total {peso(draftTotal)}
                                </p>
                            </div>
                            <Button
                                variant="secondary"
                                loading={calculating}
                                onClick={() => void calculate()}
                            >
                                Calculate
                            </Button>
                        </div>
                    </div>

                    <div className="mt-5 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setCreating(false)}>
                            Cancel
                        </Button>
                        <Button loading={busy} onClick={() => void create()}>
                            Create draft
                        </Button>
                    </div>
                </Modal>
            )}

            {paying && (
                <Modal title={`Mark payout #${paying.id} as paid`} onClose={() => setPaying(null)}>
                    <p className="text-sm text-muted">
                        {paying.staffName} · {peso(paying.totalAmount)} ·{" "}
                        {paying.periodStart} → {paying.periodEnd}
                    </p>
                    <div className="mt-4">
                        <Select
                            label="Payment method"
                            value={paymentMethod}
                            onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                            options={PAYMENT_OPTIONS}
                        />
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setPaying(null)}>
                            Cancel
                        </Button>
                        <Button
                            loading={busy}
                            onClick={() => void changeStatus(paying, "paid", paymentMethod)}
                        >
                            Confirm paid
                        </Button>
                    </div>
                </Modal>
            )}

            {voiding && (
                <ConfirmDialog
                    title="Void commission payout"
                    message={`Void payout #${voiding.id} for ${voiding.staffName}? Its entries stay on the ledger and are not settleable by this payout.`}
                    confirmLabel="Void payout"
                    busy={busy}
                    onConfirm={() => void changeStatus(voiding, "void")}
                    onCancel={() => setVoiding(null)}
                />
            )}
        </div>
    );
}
