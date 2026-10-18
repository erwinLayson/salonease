import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import { toast } from "../../lib/toast";
import { dateInDays, peso } from "../../lib/utils";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";

import type {
    CommissionPreview,
    CommissionRateType,
    CommissionRule,
    OwnerService,
    OwnerStaff,
} from "../../types";

const CATEGORY_OPTIONS = [
    { value: "", label: "Any category" },
    { value: "hair", label: "Hair" },
    { value: "makeup", label: "Makeup" },
    { value: "nails", label: "Nails" },
    { value: "skin", label: "Skin" },
    { value: "bridal", label: "Bridal" },
    { value: "event", label: "Event" },
    { value: "package", label: "Package" },
    { value: "other", label: "Other" },
];

const RATE_OPTIONS = [
    { value: "percent", label: "Percent of sale" },
    { value: "fixed", label: "Fixed amount" },
];

interface RuleForm {
    staffId: string;
    serviceId: string;
    serviceCategory: string;
    rateType: CommissionRateType;
    rateValue: string;
    effectiveFrom: string;
    effectiveTo: string;
    priority: string;
    notes: string;
    isActive: boolean;
}

const emptyForm = (): RuleForm => ({
    staffId: "",
    serviceId: "",
    serviceCategory: "",
    rateType: "percent",
    rateValue: "10",
    effectiveFrom: dateInDays(0),
    effectiveTo: "",
    priority: "0",
    notes: "",
    isActive: true,
});

const fromRule = (rule: CommissionRule): RuleForm => ({
    staffId: rule.staffId === null ? "" : String(rule.staffId),
    serviceId: rule.serviceId === null ? "" : String(rule.serviceId),
    serviceCategory: rule.serviceCategory ?? "",
    rateType: rule.rateType,
    rateValue: String(rule.rateValue),
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo ?? "",
    priority: String(rule.priority),
    notes: rule.notes ?? "",
    isActive: rule.isActive,
});

const describeRule = (
    rule: CommissionRule,
    staff: OwnerStaff[],
    services: OwnerService[]
): string => {
    const staffRow =
        rule.staffId === null
            ? null
            : staff.find((row) => row.id === rule.staffId);
    const staffName =
        rule.staffId === null
            ? "All staff"
            : staffRow
              ? `${staffRow.first_name} ${staffRow.last_name}`
              : `Staff #${rule.staffId}`;
    const serviceName =
        rule.serviceId === null
            ? rule.serviceCategory === null
                ? "All services"
                : `${rule.serviceCategory} services`
            : (services.find((row) => row.id === rule.serviceId)?.name ??
              `Service #${rule.serviceId}`);
    return `${staffName} · ${serviceName}`;
};

const rateLabel = (rule: CommissionRule): string =>
    rule.rateType === "percent"
        ? `${rule.rateValue}%`
        : peso(rule.rateValue);

export default function CommissionRulesPage() {
    const [rules, setRules] = useState<CommissionRule[]>([]);
    const [staff, setStaff] = useState<OwnerStaff[]>([]);
    const [services, setServices] = useState<OwnerService[]>([]);
    const [loading, setLoading] = useState(true);

    const [editing, setEditing] = useState<CommissionRule | "new" | null>(null);
    const [form, setForm] = useState<RuleForm>(emptyForm);
    const [deleting, setDeleting] = useState<CommissionRule | null>(null);
    const [busy, setBusy] = useState(false);

    const [preview, setPreview] = useState<{
        staffId: string;
        serviceId: string;
        baseAmount: string;
        result: CommissionPreview | null;
    }>({ staffId: "", serviceId: "", baseAmount: "100", result: null });
    const [previewing, setPreviewing] = useState(false);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<{ data: CommissionRule[] }>(
                "/owner/commission-rules",
                { params: { includeInactive: true } }
            );
            setRules(res.data.data);
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
        void api
            .get<{ data: OwnerService[] }>("/owner/services", {
                params: { includeInactive: true },
            })
            .then((res) => setServices(res.data.data))
            .catch(() => {});
    }, [reload]);

    const openCreate = () => {
        setForm(emptyForm());
        setEditing("new");
    };

    const openEdit = (rule: CommissionRule) => {
        setForm(fromRule(rule));
        setEditing(rule);
    };

    const save = async () => {
        const rateValue = Number(form.rateValue);
        if (form.rateValue === "" || Number.isNaN(rateValue) || rateValue < 0) {
            toast.error("Rate must be zero or more.");
            return;
        }
        if (form.rateType === "percent" && rateValue > 100) {
            toast.error("A percentage rate cannot exceed 100.");
            return;
        }
        if (!form.effectiveFrom) {
            toast.error("Choose the date the rule takes effect.");
            return;
        }
        if (form.effectiveTo && form.effectiveTo < form.effectiveFrom) {
            toast.error("The end date must be on or after the start date.");
            return;
        }

        setBusy(true);
        try {
            const payload = {
                staffId: form.staffId ? Number(form.staffId) : null,
                serviceId: form.serviceId ? Number(form.serviceId) : null,
                serviceCategory: form.serviceCategory || null,
                rateType: form.rateType,
                rateValue,
                effectiveFrom: form.effectiveFrom,
                effectiveTo: form.effectiveTo || null,
                priority: form.priority ? Number(form.priority) : 0,
                notes: form.notes || null,
                isActive: form.isActive,
            };

            if (editing === "new") {
                await api.post("/owner/commission-rules", payload);
                toast.success("Commission rule created.");
            } else if (editing) {
                await api.put(`/owner/commission-rules/${editing.id}`, payload);
                toast.success("Commission rule updated.");
            }
            setEditing(null);
            await reload();
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!deleting) return;
        setBusy(true);
        try {
            await api.delete(`/owner/commission-rules/${deleting.id}`);
            toast.success("Commission rule deleted.");
            setDeleting(null);
            await reload();
        } finally {
            setBusy(false);
        }
    };

    const runPreview = async () => {
        if (!preview.staffId || !preview.serviceId) {
            toast.error("Choose a staff member and a service.");
            return;
        }
        setPreviewing(true);
        try {
            const res = await api.post<{ data: CommissionPreview }>(
                "/owner/commission-rules/preview",
                {
                    staffId: Number(preview.staffId),
                    serviceId: Number(preview.serviceId),
                    baseAmount: Number(preview.baseAmount || 0),
                }
            );
            setPreview((current) => ({ ...current, result: res.data.data }));
        } catch {
            setPreview((current) => ({ ...current, result: null }));
        } finally {
            setPreviewing(false);
        }
    };

    return (
        <div className="grid gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Commission rules
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                        The most specific active rule wins: staff + service → staff +
                        category → staff → service → global.
                    </p>
                </div>
                <Button onClick={openCreate}>New rule</Button>
            </header>

            <Card title="Rules">
                {loading && rules.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted">Loading…</p>
                )}

                {!loading && rules.length === 0 && (
                    <div className="py-8 text-center">
                        <p className="text-sm font-medium text-charcoal">
                            No commission rules yet.
                        </p>
                        <p className="mt-1 text-xs text-muted">
                            Without a matching rule a completed sale accrues 0 commission
                            and appears in the reconciliation report.
                        </p>
                    </div>
                )}

                {rules.length > 0 && (
                    <div className="-mx-5 overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead>
                                <tr className="border-y border-border text-xs uppercase tracking-wide text-muted">
                                    <th className="px-5 py-2 font-semibold">Applies to</th>
                                    <th className="px-3 py-2 font-semibold">Rate</th>
                                    <th className="px-3 py-2 font-semibold">Effective</th>
                                    <th className="px-3 py-2 font-semibold">Priority</th>
                                    <th className="px-3 py-2 font-semibold">Status</th>
                                    <th className="px-5 py-2 text-right font-semibold">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules.map((rule) => (
                                    <tr
                                        key={rule.id}
                                        className="border-b border-border last:border-0 hover:bg-charcoal/[0.02]"
                                    >
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-charcoal">
                                                {describeRule(rule, staff, services)}
                                            </p>
                                            {rule.notes && (
                                                <p className="mt-0.5 text-xs text-muted">
                                                    {rule.notes}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 font-medium">
                                            {rateLabel(rule)}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-muted">
                                            {rule.effectiveFrom}
                                            {rule.effectiveTo
                                                ? ` → ${rule.effectiveTo}`
                                                : " → open"}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-muted">
                                            {rule.priority}
                                        </td>
                                        <td className="px-3 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    rule.isActive
                                                        ? "bg-success-bg text-success"
                                                        : "bg-charcoal/10 text-charcoal"
                                                }`}
                                            >
                                                {rule.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => openEdit(rule)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    onClick={() => setDeleting(rule)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card title="Preview calculator">
                <p className="mb-4 text-sm text-muted">
                    Check which rule would apply to a sale before changing anything.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Select
                        label="Staff"
                        value={preview.staffId}
                        onChange={(value) =>
                            setPreview((current) => ({
                                ...current,
                                staffId: value,
                                result: null,
                            }))
                        }
                        options={[
                            { value: "", label: "Choose staff" },
                            ...staff.map((row) => ({
                                value: String(row.id),
                                label: `${row.first_name} ${row.last_name}`,
                            })),
                        ]}
                    />
                    <Select
                        label="Service"
                        value={preview.serviceId}
                        onChange={(value) =>
                            setPreview((current) => ({
                                ...current,
                                serviceId: value,
                                result: null,
                            }))
                        }
                        options={[
                            { value: "", label: "Choose service" },
                            ...services.map((row) => ({
                                value: String(row.id),
                                label: row.name,
                            })),
                        ]}
                    />
                    <Field
                        label="Sale amount"
                        type="number"
                        value={preview.baseAmount}
                        onChange={(value) =>
                            setPreview((current) => ({
                                ...current,
                                baseAmount: value,
                                result: null,
                            }))
                        }
                    />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm">
                        {preview.result === null ? (
                            <span className="text-muted">
                                Run a preview to see the resolved rule.
                            </span>
                        ) : preview.result.rule === null ? (
                            <span className="font-medium text-danger">
                                No active rule matches — commission would be 0.
                            </span>
                        ) : (
                            <span className="text-charcoal">
                                Rule #{preview.result.rule.id} applies (
                                {preview.result.rule.rateType === "percent"
                                    ? `${preview.result.rule.rateValue}%`
                                    : peso(preview.result.rule.rateValue)}
                                ) → <strong>{peso(preview.result.commissionAmount)}</strong>
                            </span>
                        )}
                    </div>
                    <Button loading={previewing} onClick={() => void runPreview()}>
                        Preview
                    </Button>
                </div>
            </Card>

            {editing && (
                <Modal
                    title={editing === "new" ? "New commission rule" : "Edit commission rule"}
                    onClose={() => setEditing(null)}
                    wide
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                            label="Staff"
                            value={form.staffId}
                            onChange={(value) =>
                                setForm((current) => ({ ...current, staffId: value }))
                            }
                            options={[
                                { value: "", label: "All staff" },
                                ...staff.map((row) => ({
                                    value: String(row.id),
                                    label: `${row.first_name} ${row.last_name}`,
                                })),
                            ]}
                        />
                        <Select
                            label="Service"
                            value={form.serviceId}
                            onChange={(value) =>
                                setForm((current) => ({
                                    ...current,
                                    serviceId: value,
                                    serviceCategory: value ? "" : current.serviceCategory,
                                }))
                            }
                            options={[
                                { value: "", label: "All services" },
                                ...services.map((row) => ({
                                    value: String(row.id),
                                    label: row.name,
                                })),
                            ]}
                        />
                        <Select
                            label="Service category"
                            value={form.serviceCategory}
                            onChange={(value) =>
                                setForm((current) => ({
                                    ...current,
                                    serviceCategory: value,
                                    serviceId: value ? "" : current.serviceId,
                                }))
                            }
                            options={CATEGORY_OPTIONS}
                        />
                        <Select
                            label="Rate type"
                            value={form.rateType}
                            onChange={(value) =>
                                setForm((current) => ({
                                    ...current,
                                    rateType: value as CommissionRateType,
                                }))
                            }
                            options={RATE_OPTIONS}
                        />
                        <Field
                            label="Rate value"
                            type="number"
                            value={form.rateValue}
                            onChange={(value) =>
                                setForm((current) => ({ ...current, rateValue: value }))
                            }
                        />
                        <Field
                            label="Priority"
                            type="number"
                            value={form.priority}
                            onChange={(value) =>
                                setForm((current) => ({ ...current, priority: value }))
                            }
                        />
                        <Field
                            label="Effective from"
                            type="date"
                            value={form.effectiveFrom}
                            onChange={(value) =>
                                setForm((current) => ({ ...current, effectiveFrom: value }))
                            }
                        />
                        <Field
                            label="Effective to (optional)"
                            type="date"
                            value={form.effectiveTo}
                            onChange={(value) =>
                                setForm((current) => ({ ...current, effectiveTo: value }))
                            }
                        />
                        <Field
                            label="Notes (optional)"
                            value={form.notes}
                            onChange={(value) =>
                                setForm((current) => ({ ...current, notes: value }))
                            }
                        />
                        <label className="flex items-center gap-2 self-end pb-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        isActive: event.target.checked,
                                    }))
                                }
                                className="h-4 w-4 rounded border-border"
                            />
                            Active
                        </label>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setEditing(null)}>
                            Cancel
                        </Button>
                        <Button loading={busy} onClick={() => void save()}>
                            {editing === "new" ? "Create rule" : "Save changes"}
                        </Button>
                    </div>
                </Modal>
            )}

            {deleting && (
                <ConfirmDialog
                    title="Delete commission rule"
                    message={`Delete the rule for ${describeRule(deleting, staff, services)}? Existing commission entries are not changed.`}
                    confirmLabel="Delete rule"
                    busy={busy}
                    onConfirm={() => void remove()}
                    onCancel={() => setDeleting(null)}
                />
            )}
        </div>
    );
}
