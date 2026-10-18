import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import { toast } from "../../lib/toast";
import { dateInDays, formatClock } from "../../lib/utils";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";

import type {
    OwnerService,
    OwnerStaff,
    QueueStatus,
    QueueTicket,
} from "../../types";

const STATUS_STYLES: Record<QueueStatus, string> = {
    waiting: "bg-warning-bg text-warning",
    called: "bg-info-bg text-info",
    in_service: "bg-primary-light text-primary-dark",
    completed: "bg-success-bg text-success",
    cancelled: "bg-danger-bg text-danger",
    no_show: "bg-charcoal/10 text-charcoal",
};

const STATUS_LABELS: Record<QueueStatus, string> = {
    waiting: "Waiting",
    called: "Called",
    in_service: "In service",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No-show",
};

const nextStatuses = (status: QueueStatus): QueueStatus[] => {
    if (status === "waiting") return ["called", "in_service", "cancelled", "no_show"];
    if (status === "called") return ["in_service", "waiting", "cancelled", "no_show"];
    if (status === "in_service") return ["completed", "cancelled"];
    return [];
};

const actionLabel = (status: QueueStatus): string =>
    status === "in_service"
        ? "Start service"
        : status === "completed"
          ? "Complete"
          : status === "no_show"
            ? "No-show"
            : status === "cancelled"
              ? "Cancel"
              : status === "called"
                ? "Call"
                : "Move back to waiting";

interface CreateForm {
    customerName: string;
    customerPhone: string;
    serviceId: string;
    preferredStaffId: string;
    assignedStaffId: string;
    notes: string;
}

const emptyCreateForm = (): CreateForm => ({
    customerName: "",
    customerPhone: "",
    serviceId: "",
    preferredStaffId: "",
    assignedStaffId: "",
    notes: "",
});

export default function QueuePage() {
    const [date, setDate] = useState(dateInDays(0));
    const [tickets, setTickets] = useState<QueueTicket[]>([]);
    const [services, setServices] = useState<OwnerService[]>([]);
    const [staff, setStaff] = useState<OwnerStaff[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState<CreateForm>(emptyCreateForm);
    const [converting, setConverting] = useState<QueueTicket | null>(null);
    const [convertStaffId, setConvertStaffId] = useState("");
    const [convertStartAt, setConvertStartAt] = useState("");
    const [busy, setBusy] = useState(false);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<{ data: QueueTicket[] }>("/owner/queue", {
                params: { date },
            });
            setTickets(res.data.data);
        } catch {
            // toast via interceptor
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        void reload();
    }, [reload]);

    useEffect(() => {
        void api
            .get<{ data: OwnerService[] }>("/owner/services")
            .then((res) => setServices(res.data.data))
            .catch(() => {});
        void api
            .get<{ data: OwnerStaff[] }>("/owner/staff")
            .then((res) => setStaff(res.data.data))
            .catch(() => {});
    }, []);

    const handleCreate = async () => {
        if (!form.customerName.trim()) {
            toast.error("Customer name is required.");
            return;
        }
        if (!form.serviceId) {
            toast.error("Choose a service.");
            return;
        }

        setBusy(true);
        try {
            await api.post("/owner/queue", {
                date,
                customerName: form.customerName,
                customerPhone: form.customerPhone || null,
                serviceId: Number(form.serviceId),
                preferredStaffId: form.preferredStaffId
                    ? Number(form.preferredStaffId)
                    : null,
                assignedStaffId: form.assignedStaffId
                    ? Number(form.assignedStaffId)
                    : null,
                notes: form.notes || null,
            });
            toast.success("Walk-in ticket created.");
            setCreating(false);
            setForm(emptyCreateForm());
            await reload();
        } finally {
            setBusy(false);
        }
    };

    const handleStatus = async (ticket: QueueTicket, status: QueueStatus) => {
        try {
            await api.patch(`/owner/queue/${ticket.id}/status`, { status });
            toast.success(`Ticket #${ticket.ticketNumber} moved to ${STATUS_LABELS[status]}.`);
            await reload();
        } catch {
            // toast via interceptor
        }
    };

    const handleConvert = async () => {
        if (!converting) return;
        if (!convertStaffId) {
            toast.error("Choose the staff member who will take the service.");
            return;
        }
        if (!convertStartAt) {
            toast.error("Choose the appointment start time.");
            return;
        }

        setBusy(true);
        try {
            await api.post(`/owner/queue/${converting.id}/convert`, {
                staffId: Number(convertStaffId),
                startAt: convertStartAt,
            });
            toast.success(`Ticket #${converting.ticketNumber} converted to an appointment.`);
            setConverting(null);
            setConvertStaffId("");
            setConvertStartAt("");
            await reload();
        } finally {
            setBusy(false);
        }
    };

    const openConvert = (ticket: QueueTicket) => {
        setConverting(ticket);
        setConvertStaffId(String(ticket.assignedStaff?.id ?? ticket.preferredStaff?.id ?? ""));
        const now = new Date();
        now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
        const pad = (value: number) => String(value).padStart(2, "0");
        setConvertStartAt(
            `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
                now.getHours()
            )}:${pad(now.getMinutes())}`
        );
    };

    const waiting = tickets.filter((ticket) => ticket.status === "waiting");
    const inService = tickets.filter((ticket) => ticket.status === "in_service");
    const averageWait =
        waiting.length > 0
            ? Math.round(
                  waiting.reduce(
                      (sum, ticket) => sum + (ticket.estimatedWaitMinutes ?? 0),
                      0
                  ) / waiting.length
              )
            : 0;

    return (
        <div className="grid gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Walk-in queue</h1>
                    <p className="mt-1 text-sm text-muted">
                        Issue tickets, call the next client, and convert a walk-in into an
                        appointment.
                    </p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                    <div className="w-44">
                        <Field label="Queue date" type="date" value={date} onChange={setDate} />
                    </div>
                    <Button onClick={() => setCreating(true)}>New ticket</Button>
                </div>
            </header>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Card>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Waiting
                    </p>
                    <p className="mt-1 text-2xl font-bold">{waiting.length}</p>
                </Card>
                <Card>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        In service
                    </p>
                    <p className="mt-1 text-2xl font-bold">{inService.length}</p>
                </Card>
                <Card>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Average ETA
                    </p>
                    <p className="mt-1 text-2xl font-bold">{averageWait} min</p>
                </Card>
                <Card>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Tickets today
                    </p>
                    <p className="mt-1 text-2xl font-bold">{tickets.length}</p>
                </Card>
            </div>

            <Card title="Queue">
                {loading ? (
                    <p className="py-8 text-center text-sm text-muted">Loading queue…</p>
                ) : tickets.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted">
                        No walk-ins recorded for this date.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                                    <th className="px-3 py-2">Ticket</th>
                                    <th className="px-3 py-2">Customer</th>
                                    <th className="px-3 py-2">Service</th>
                                    <th className="px-3 py-2">Staff</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2">ETA</th>
                                    <th className="px-3 py-2">Checked in</th>
                                    <th className="px-3 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map((ticket) => (
                                    <tr key={ticket.id} className="border-b border-border/70">
                                        <td className="px-3 py-3 font-mono font-semibold">
                                            #{ticket.ticketNumber}
                                        </td>
                                        <td className="px-3 py-3">
                                            <p className="font-medium">{ticket.customerName}</p>
                                            <p className="text-xs text-muted">
                                                {ticket.customerPhone ?? "No phone"}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3">
                                            {ticket.service.name}
                                            <span className="ml-1 text-xs text-muted">
                                                ({ticket.service.durationMinutes}m)
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            {ticket.assignedStaff?.name ??
                                                ticket.preferredStaff?.name ??
                                                "Unassigned"}
                                        </td>
                                        <td className="px-3 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}
                                            >
                                                {STATUS_LABELS[ticket.status]}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            {ticket.status === "waiting" ||
                                            ticket.status === "called"
                                                ? `${ticket.estimatedWaitMinutes ?? 0} min`
                                                : "—"}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-muted">
                                            {formatClock(new Date(ticket.checkedInAt).toISOString())}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex flex-wrap gap-1.5">
                                                {nextStatuses(ticket.status).map((status) => (
                                                    <button
                                                        key={status}
                                                        type="button"
                                                        onClick={() => void handleStatus(ticket, status)}
                                                        className="rounded-lg border border-border px-2 py-1 text-xs transition-colors hover:bg-charcoal/5"
                                                    >
                                                        {actionLabel(status)}
                                                    </button>
                                                ))}
                                                {!ticket.appointmentId &&
                                                    ticket.status !== "completed" &&
                                                    ticket.status !== "cancelled" &&
                                                    ticket.status !== "no_show" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openConvert(ticket)}
                                                            className="rounded-lg border border-primary px-2 py-1 text-xs text-primary-dark transition-colors hover:bg-primary-light/30"
                                                        >
                                                            Convert
                                                        </button>
                                                    )}
                                                {ticket.appointmentId && (
                                                    <span className="text-xs text-success">
                                                        Appointment #{ticket.appointmentId}
                                                    </span>
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
                <Modal title="New walk-in ticket" onClose={() => setCreating(false)}>
                    <div className="space-y-4">
                        <Field
                            label="Customer name"
                            value={form.customerName}
                            onChange={(value) => setForm((f) => ({ ...f, customerName: value }))}
                        />
                        <Field
                            label="Phone (required to convert later)"
                            value={form.customerPhone}
                            onChange={(value) => setForm((f) => ({ ...f, customerPhone: value }))}
                        />
                        <Select
                            label="Service"
                            value={form.serviceId}
                            onChange={(value) => setForm((f) => ({ ...f, serviceId: value }))}
                            options={[
                                { value: "", label: "Choose a service" },
                                ...services.map((service) => ({
                                    value: String(service.id),
                                    label: `${service.name} · ${service.duration_minutes}m`,
                                })),
                            ]}
                        />
                        <Select
                            label="Preferred staff (optional)"
                            value={form.preferredStaffId}
                            onChange={(value) =>
                                setForm((f) => ({ ...f, preferredStaffId: value }))
                            }
                            options={[
                                { value: "", label: "No preference" },
                                ...staff.map((member) => ({
                                    value: String(member.id),
                                    label: `${member.first_name} ${member.last_name}`,
                                })),
                            ]}
                        />
                        <Select
                            label="Assigned staff (optional)"
                            value={form.assignedStaffId}
                            onChange={(value) =>
                                setForm((f) => ({ ...f, assignedStaffId: value }))
                            }
                            options={[
                                { value: "", label: "Unassigned" },
                                ...staff.map((member) => ({
                                    value: String(member.id),
                                    label: `${member.first_name} ${member.last_name}`,
                                })),
                            ]}
                        />
                        <Field
                            label="Notes (optional)"
                            value={form.notes}
                            onChange={(value) => setForm((f) => ({ ...f, notes: value }))}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setCreating(false)}>
                                Cancel
                            </Button>
                            <Button onClick={() => void handleCreate()} loading={busy}>
                                Create ticket
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {converting && (
                <Modal
                    title={`Convert ticket #${converting.ticketNumber}`}
                    onClose={() => setConverting(null)}
                >
                    <div className="space-y-4">
                        <p className="text-sm text-muted">
                            {converting.customerName} · {converting.service.name}
                        </p>
                        <Select
                            label="Staff member"
                            value={convertStaffId}
                            onChange={setConvertStaffId}
                            options={[
                                { value: "", label: "Choose staff" },
                                ...staff.map((member) => ({
                                    value: String(member.id),
                                    label: `${member.first_name} ${member.last_name}`,
                                })),
                            ]}
                        />
                        <Field
                            label="Appointment start"
                            type="datetime-local"
                            value={convertStartAt}
                            onChange={setConvertStartAt}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setConverting(null)}>
                                Cancel
                            </Button>
                            <Button onClick={() => void handleConvert()} loading={busy}>
                                Convert to appointment
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
