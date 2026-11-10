import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { toast } from "../../lib/toast";

// UI components
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Field } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";

// Shared dashboard components
import { WalkInBookingWizard } from "../../components/owner/WalkInBookingWizard";
import { NotesForm } from "../../components/owner/NotesForm";
import { RescheduleForm } from "../../components/owner/RescheduleForm";
import { StatusAction } from "../../components/owner/StatusAction";

// Types
import type {
    AppointmentDetail,
    AppointmentStatus,
    OwnerService,
    OwnerStaff,
} from "../../types";

// Utilities
import { dateInDays, formatClock, formatDateTime, peso } from "../../lib/utils";

const STATUS_OPTIONS = [
    { value: "", label: "All statuses" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "no_show", label: "No-show" },
];

export default function OwnerDashboard() {
    const [view, setView] = useState<"day" | "upcoming">("upcoming");
    const [date, setDate] = useState(dateInDays(0));
    const [staffId, setStaffId] = useState("");
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");

    const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
    const [staff, setStaff] = useState<OwnerStaff[]>([]);
    const [services, setServices] = useState<OwnerService[]>([]);

    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);

    const [rescheduleFor, setRescheduleFor] = useState<AppointmentDetail | null>(null);
    const [notesFor, setNotesFor] = useState<AppointmentDetail | null>(null);
    const [confirmFor, setConfirmFor] = useState<{
        appointment: AppointmentDetail;
        next: AppointmentStatus;
    } | null>(null);
    const [showNew, setShowNew] = useState(false);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<{ data: AppointmentDetail[] }>("/owner/appointments", {
                params: {
                    ...(view === "upcoming" ? { from: dateInDays(0) } : { date }),
                    ...(staffId ? { staffId } : {}),
                    ...(status ? { status } : {}),
                    ...(search ? { search } : {}),
                },
            });
            setAppointments(res.data.data);
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setLoading(false);
        }
    }, [view, date, staffId, status, search]);

    useEffect(() => {
        // Defer to a microtask so the effect body stays synchronous-free.
        void Promise.resolve().then(reload);
    }, [reload]);

    useEffect(() => {
        const load = async () => {
            try {
                const [staffRes, servicesRes] = await Promise.all([
                    api.get<{ data: OwnerStaff[] }>("/owner/staff"),
                    api.get<{ data: OwnerService[] }>("/owner/services"),
                ]);
                setStaff(staffRes.data.data.filter((member) => member.is_active === 1));
                setServices(servicesRes.data.data.filter((service) => service.is_active === 1));
            } catch {
                // Failures surface as a toast via the axios error interceptor.
            }
        };
        void load();
    }, []);

    const changeStatus = async (
        appointment: AppointmentDetail,
        next: AppointmentStatus
    ): Promise<boolean> => {
        setBusy(true);
        try {
            await api.patch(`/owner/appointments/${appointment.id}/status`, { status: next });
            toast.success(`${appointment.reference} marked as ${next.replace(/_/g, " ")}.`);
            await reload();
            return true;
        } catch {
            // Failures surface as a toast via the axios error interceptor.
            return false;
        } finally {
            setBusy(false);
        }
    };

    const hasFilters = Boolean(
        staffId || status || search || view === "day" || date !== dateInDays(0)
    );
    const dayLabel = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
    const emptyTitle = hasFilters
        ? "No appointments match these filters"
        : view === "upcoming"
          ? "No upcoming appointments"
          : `No appointments on ${dayLabel}`;
    const emptyHint = hasFilters
        ? "Clear the staff, status or search filters, or switch the view."
        : view === "upcoming"
          ? "New bookings will appear here as soon as they are made."
          : "Pick a different date, or view every booking from today onward.";

    return (
        <div className="grid gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Appointments</h1>
                    <p className="mt-1 text-sm text-muted">
                        Filter, confirm and manage your bookings.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowNew(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-dark min-h-11 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-press focus-visible:outline-2 focus-visible:outline-primary-dark"
                >
                    <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New walk-in / phone booking
                </button>
            </header>

            <Card
                title="Filter appointments"
                actions={
                    <div className="flex items-center gap-2">
                        {hasFilters && (
                            <button
                                type="button"
                                onClick={() => {
                                    setView("upcoming");
                                    setDate(dateInDays(0));
                                    setStaffId("");
                                    setStatus("");
                                    setSearch("");
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-charcoal/5 transition-colors"
                            >
                                <svg
                                    className="h-3.5 w-3.5 text-muted"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                    <path d="M3 3v5h5" />
                                </svg>
                                Reset filters
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => void reload()}
                            disabled={loading}
                            title="Reload appointments"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-charcoal/5 transition-colors disabled:opacity-50"
                        >
                            <svg
                                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <polyline points="23 4 23 10 17 10" />
                                <polyline points="1 20 1 14 7 14" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                            Refresh
                        </button>
                    </div>
                }
            >
                {/* View & Timeframe Control Strip */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-charcoal/[0.02] p-2.5 sm:p-3 border border-border/50">
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                            Show
                        </span>
                        <div
                            className="inline-flex rounded-lg bg-charcoal/5 p-1 border border-border/40"
                            role="group"
                            aria-label="Date range"
                        >
                            <button
                                type="button"
                                onClick={() => setView("upcoming")}
                                aria-pressed={view === "upcoming"}
                                className={`rounded-md px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                                    view === "upcoming"
                                        ? "bg-primary-dark text-white shadow-xs"
                                        : "text-charcoal hover:bg-charcoal/5"
                                }`}
                            >
                                Upcoming
                            </button>
                            <button
                                type="button"
                                onClick={() => setView("day")}
                                aria-pressed={view === "day"}
                                className={`rounded-md px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                                    view === "day"
                                        ? "bg-primary-dark text-white shadow-xs"
                                        : "text-charcoal hover:bg-charcoal/5"
                                }`}
                            >
                                Selected day
                            </button>
                        </div>

                        {view === "day" && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const d = new Date(`${date}T00:00:00`);
                                        d.setDate(d.getDate() - 1);
                                        setDate(d.toISOString().slice(0, 10));
                                    }}
                                    aria-label="Previous day"
                                    title="Previous day"
                                    className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-charcoal hover:bg-charcoal/5 transition-colors text-base font-bold"
                                >
                                    ‹
                                </button>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    aria-label="Select date"
                                    className="h-9 rounded-lg border border-border bg-surface px-2.5 text-sm font-medium text-charcoal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const d = new Date(`${date}T00:00:00`);
                                        d.setDate(d.getDate() + 1);
                                        setDate(d.toISOString().slice(0, 10));
                                    }}
                                    aria-label="Next day"
                                    title="Next day"
                                    className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-charcoal hover:bg-charcoal/5 transition-colors text-base font-bold"
                                >
                                    ›
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDate(dateInDays(0))}
                                    className="h-9 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-charcoal hover:bg-charcoal/5 transition-colors"
                                >
                                    Today
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted">
                        <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                        <span>
                            {view === "upcoming"
                                ? "Every booking from today onward, soonest first"
                                : dayLabel}
                        </span>
                    </div>
                </div>

                {/* Structured Filter Inputs Grid */}
                <div className="grid gap-3 sm:grid-cols-3">
                    <Select
                        label="Staff"
                        value={staffId}
                        onChange={setStaffId}
                        options={[
                            { value: "", label: "All staff" },
                            ...staff.map((member) => ({
                                value: String(member.id),
                                label: `${member.first_name} ${member.last_name}`,
                            })),
                        ]}
                    />
                    <Select
                        label="Status"
                        value={status}
                        onChange={setStatus}
                        options={STATUS_OPTIONS}
                    />
                    <Field
                        label="Search"
                        value={search}
                        onChange={setSearch}
                        placeholder="Reference or name"
                    />
                </div>
            </Card>

            {showNew && (
                <Modal
                    title="New walk-in / phone booking"
                    onClose={() => setShowNew(false)}
                    wide
                >
                    <WalkInBookingWizard
                        services={services}
                        onDone={async (message) => {
                            setShowNew(false);
                            toast.success(message);
                            await reload();
                        }}
                    />
                </Modal>
            )}

            {rescheduleFor && (
                <Modal
                    title={`Reschedule ${rescheduleFor.reference}`}
                    onClose={() => setRescheduleFor(null)}
                    wide
                >
                    <RescheduleForm
                        appointment={rescheduleFor}
                        staff={staff}
                        onClose={() => setRescheduleFor(null)}
                        onDone={async (message) => {
                            setRescheduleFor(null);
                            toast.success(message);
                            await reload();
                        }}
                    />
                </Modal>
            )}

            {notesFor && (
                <Modal
                    title={`Notes — ${notesFor.reference}`}
                    onClose={() => setNotesFor(null)}
                >
                    <NotesForm
                        appointment={notesFor}
                        onClose={() => setNotesFor(null)}
                        onDone={async (message) => {
                            setNotesFor(null);
                            toast.success(message);
                            await reload();
                        }}
                    />
                </Modal>
            )}

            {confirmFor !== null && (
                <ConfirmDialog
                    title={
                        confirmFor.next === "cancelled"
                            ? "Cancel appointment"
                            : "Mark as no-show"
                    }
                    confirmLabel={
                        confirmFor.next === "cancelled"
                            ? "Cancel appointment"
                            : "Mark no-show"
                    }
                    busy={busy}
                    busyLabel="Saving…"
                    onConfirm={() => {
                        const target = confirmFor;
                        void (async () => {
                            if (
                                await changeStatus(target.appointment, target.next)
                            ) {
                                setConfirmFor(null);
                            }
                        })();
                    }}
                    onCancel={() => setConfirmFor(null)}
                    message={
                        confirmFor.next === "cancelled" ? (
                            <>
                                <p>
                                    Cancel{" "}
                                    <strong>{confirmFor.appointment.reference}</strong>{" "}
                                    for{" "}
                                    <strong>
                                        {confirmFor.appointment.customer.name}
                                    </strong>
                                    ? The slot will be released and the booking cannot
                                    be reopened.
                                </p>
                                <p className="mt-2 text-xs text-muted">
                                    {confirmFor.appointment.service.name} ·{" "}
                                    {formatDateTime(confirmFor.appointment.startAt)}
                                </p>
                            </>
                        ) : (
                            <>
                                <p>
                                    Mark{" "}
                                    <strong>{confirmFor.appointment.reference}</strong>{" "}
                                    (
                                    {confirmFor.appointment.customer.name}) as
                                    no-show? This records that the customer did not
                                    attend.
                                </p>
                                <p className="mt-2 text-xs text-muted">
                                    {confirmFor.appointment.service.name} ·{" "}
                                    {formatDateTime(confirmFor.appointment.startAt)}
                                </p>
                            </>
                        )
                    }
                />
            )}

            <Card title={`Appointments (${appointments.length})`}>
                {loading && (
                    <p className="py-4 text-center text-sm text-muted">
                        Loading…
                    </p>
                )}
                {!loading && appointments.length === 0 && (
                    <div className="py-7 text-center">
                        <span
                            aria-hidden
                            className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-charcoal/5 text-muted"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            >
                                <rect x="3" y="5" width="18" height="16" rx="2" />
                                <path d="M3 9h18M8 3v4M16 3v4" />
                            </svg>
                        </span>
                        <p className="mt-2.5 text-sm font-medium text-charcoal">{emptyTitle}</p>
                        <p className="mt-1 text-xs text-muted max-w-sm mx-auto">{emptyHint}</p>
                        {view === "day" && (
                            <button
                                type="button"
                                onClick={() => setView("upcoming")}
                                className="mt-3.5 inline-flex min-h-10 items-center rounded-lg border border-border px-3.5 text-xs font-medium text-charcoal transition-colors hover:bg-charcoal/5"
                            >
                                View upcoming appointments
                            </button>
                        )}
                    </div>
                )}

                <ul className="grid gap-3">
                    {appointments.map((appointment) => (
                        <li
                            key={appointment.id}
                            className="rounded-xl border border-border p-4 transition-colors hover:border-primary/70"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-sm font-semibold">
                                    {appointment.reference}
                                </span>
                                <StatusBadge status={appointment.status} />
                                <span className="rounded bg-charcoal/5 px-1.5 py-0.5 text-[11px] text-muted">
                                    {appointment.source === "manual" ? "Walk-in / phone" : "Online"}
                                </span>
                                <span className="ml-auto rounded-lg bg-primary-light px-2.5 py-1 text-xs font-medium text-charcoal">
                                    {formatClock(appointment.startAt)} –{" "}
                                    {formatClock(appointment.endAt)}
                                </span>
                            </div>

                            <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                                <div>
                                    <span className="text-muted">Customer: </span>
                                    {appointment.customer.name}
                                    {appointment.customer.phone
                                        ? ` · ${appointment.customer.phone}`
                                        : ""}
                                </div>
                                <div>
                                    <span className="text-muted">Service: </span>
                                    {appointment.service.name} (
                                    {appointment.service.durationMinutes} min ·{" "}
                                    {peso(appointment.price)})
                                </div>
                                <div>
                                    <span className="text-muted">Staff: </span>
                                    {appointment.staff.name}
                                </div>
                                <div>
                                    <span className="text-muted">Date: </span>
                                    {formatDateTime(appointment.startAt)}
                                </div>
                            </dl>

                            {appointment.notes && (
                                <p className="mt-2 whitespace-pre-line rounded-lg bg-charcoal/5 p-2 text-xs">
                                    {appointment.notes}
                                </p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                                {appointment.status === "pending" && (
                                    <StatusAction
                                        label="Confirm"
                                        disabled={busy}
                                        onClick={() => void changeStatus(appointment, "confirmed")}
                                    />
                                )}
                                {appointment.status === "confirmed" && (
                                    <StatusAction
                                        label="Complete"
                                        disabled={busy}
                                        onClick={() => void changeStatus(appointment, "completed")}
                                    />
                                )}
                                {(appointment.status === "pending" ||
                                    appointment.status === "confirmed") && (
                                    <>
                                        <StatusAction
                                            label="Cancel"
                                            disabled={busy}
                                            onClick={() =>
                                                setConfirmFor({
                                                    appointment,
                                                    next: "cancelled",
                                                })
                                            }
                                        />
                                        <StatusAction
                                            label="No-show"
                                            disabled={busy}
                                            onClick={() =>
                                                setConfirmFor({
                                                    appointment,
                                                    next: "no_show",
                                                })
                                            }
                                        />
                                        <StatusAction
                                            label="Reschedule"
                                            disabled={busy}
                                            onClick={() => setRescheduleFor(appointment)}
                                        />
                                    </>
                                )}
                                <StatusAction
                                    label="Notes"
                                    disabled={busy}
                                    onClick={() => setNotesFor(appointment)}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
    );
}
