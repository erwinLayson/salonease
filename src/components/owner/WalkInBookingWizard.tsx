import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

import { BackButton } from "../ui/BackButton";
import { Calendar } from "../ui/Calendar";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { Row } from "../ui/Row";

import { dateInDays, formatScheduleLabel, peso } from "../../lib/utils";

import type {
    AppointmentDetail,
    AvailabilityResponse,
    MonthAvailabilityResponse,
    OwnerService,
    SlotAvailabilityStatus,
    StaffForService,
} from "../../types";

type Step = "service" | "staff" | "date" | "time" | "review";

const STEP_LABELS: Array<{ key: Step; label: string }> = [
    { key: "service", label: "Service" },
    { key: "staff", label: "Staff" },
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "review", label: "Review" },
];

/** Visual treatment for the day-level availability status. */
const STATUS_META: Record<SlotAvailabilityStatus, { label: string; className: string }> = {
    available: {
        label: "Available",
        className: "border-success-line bg-success-bg text-success",
    },
    busy: { label: "Busy", className: "border-warning-line bg-warning-bg text-warning" },
    unavailable: {
        label: "Unavailable",
        className: "border-danger-line bg-danger-bg text-danger",
    },
};

function StatusBadge(props: { status: SlotAvailabilityStatus }) {
    const meta = STATUS_META[props.status];
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
        >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {meta.label}
        </span>
    );
}

function StatusBanner(props: { status: SlotAvailabilityStatus; reason: string | null }) {
    const meta = STATUS_META[props.status];
    const fallbacks: Record<SlotAvailabilityStatus, string> = {
        available: "This staff member is free on this date.",
        busy: "This staff member is fully booked on this date.",
        unavailable: "This staff member is not available on this date.",
    };

    return (
        <div
            role="status"
            className={`mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${meta.className}`}
        >
            <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-current" />
            <div className="min-w-0">
                <p className="font-semibold">{meta.label}</p>
                <p className="mt-0.5">{props.reason ?? fallbacks[props.status]}</p>
            </div>
        </div>
    );
}

/** `Initials` from a full name, for the staff avatar chip. */
const initialsOf = (name: string): string =>
    name
        .split(/\s+/)
        .map((part) => part[0] ?? "")
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

const formatDayLabel = (key: string): string => {
    const [year = "0", month = "1", day = "1"] = key.split("-");
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
        undefined,
        { weekday: "short", month: "short", day: "numeric" }
    );
};

/**
 * Service-first walk-in / phone booking wizard (FR-AP4).
 *
 * Service → eligible staff → available dates → available times → review.
 * Every availability decision (eligible staff, open dates, open times) comes
 * from the backend; the final create call re-checks the slot server-side.
 */
export function WalkInBookingWizard(props: {
    services: OwnerService[];
    onDone: (message: string) => void | Promise<void>;
}) {
    const [step, setStep] = useState<Step>("service");
    const [serviceId, setServiceId] = useState<number | null>(null);
    const [staffId, setStaffId] = useState<number | null>(null);
    const [date, setDate] = useState<string>(dateInDays(0));
    const [slot, setSlot] = useState<string | null>(null);
    const [month, setMonth] = useState<string>(() => dateInDays(0).slice(0, 7));

    const [staffOptions, setStaffOptions] = useState<StaffForService[]>([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [monthDates, setMonthDates] = useState<Record<string, number> | null>(null);
    const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        notes: "",
    });
    const [busy, setBusy] = useState(false);

    const service = useMemo(
        () => props.services.find((item) => item.id === serviceId) ?? null,
        [props.services, serviceId]
    );
    const selectedStaff = useMemo(
        () => staffOptions.find((member) => member.staffId === staffId) ?? null,
        [staffOptions, staffId]
    );

    // Step 2: eligible staff for the selected service (only these can perform it).
    useEffect(() => {
        if (serviceId === null) {
            return;
        }
        const load = async () => {
            setStaffLoading(true);
            try {
                const res = await api.get<{ data: StaffForService[] }>(
                    `/owner/services/${serviceId}/staff`,
                    { params: { date: dateInDays(0) } }
                );
                setStaffOptions(res.data.data);
            } catch {
                setStaffOptions([]);
            } finally {
                setStaffLoading(false);
            }
        };
        void load();
    }, [serviceId]);

    // Step 3: open dates for the chosen staff member + service.
    useEffect(() => {
        if (step !== "date" || serviceId === null || staffId === null) {
            return;
        }
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get<{ data: MonthAvailabilityResponse }>(
                    "/owner/availability-month",
                    {
                        params: {
                            serviceId,
                            staffId,
                            month,
                            walkIn: true,
                        },
                    }
                );
                const entry = res.data.data.staff.find(
                    (member) => member.staffId === staffId
                );
                setMonthDates(entry?.dates ?? {});
            } catch {
                setMonthDates({});
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [step, serviceId, staffId, month]);

    // Step 4: open times for the chosen date.
    useEffect(() => {
        if (step !== "time" || serviceId === null || staffId === null) {
            return;
        }
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get<{ data: AvailabilityResponse }>(
                    "/owner/availability",
                    { params: { serviceId, staffId, date, walkIn: true } }
                );
                setAvailability(res.data.data);
            } catch {
                setAvailability(null);
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [step, serviceId, staffId, date]);

    const resetAfterService = () => {
        setStaffId(null);
        setDate(dateInDays(0));
        setSlot(null);
        setMonth(dateInDays(0).slice(0, 7));
        setMonthDates(null);
        setAvailability(null);
    };

    const slots = availability?.staff[0]?.slots ?? [];
    const dayEntry = availability?.staff[0] ?? null;

    const submit = async () => {
        if (!service || !staffId || !slot) {
            return;
        }
        setBusy(true);
        try {
            const res = await api.post<{ data: AppointmentDetail }>(
                "/owner/appointments",
                {
                    serviceId: service.id,
                    staffId,
                    startAt: `${date}T${slot}:00`,
                    firstName: form.firstName,
                    lastName: form.lastName || null,
                    phone: form.phone || null,
                    email: form.email || null,
                    notes: form.notes || null,
                }
            );
            await props.onDone(`Booking ${res.data.data.reference} created.`);
        } catch {
            // Failures surface as a toast via the axios error interceptor.
            // A 409 means the slot was taken after review — go back to times.
            setSlot(null);
            setStep("time");
        } finally {
            setBusy(false);
        }
    };

    if (props.services.length === 0) {
        return (
            <p className="text-sm text-muted">
                Add an active service before creating a walk-in booking.
            </p>
        );
    }

    const stepIndex = STEP_LABELS.findIndex((entry) => entry.key === step);
    const canConfirm =
        !!service && !!staffId && !!slot && !!form.firstName && (!!form.phone || !!form.email);

    return (
        <div>
            <ol
                className="mb-6 flex items-center text-xs sm:text-sm"
                aria-label="Walk-in booking progress"
            >
                {STEP_LABELS.map((entry, index) => (
                    <li
                        key={entry.key}
                        className="flex items-center"
                        aria-current={index === stepIndex ? "step" : undefined}
                    >
                        {index > 0 && (
                            <span
                                aria-hidden
                                className={`mx-2 h-px flex-1 ${
                                    index <= stepIndex
                                        ? "bg-primary-dark/50"
                                        : "bg-charcoal/10"
                                }`}
                            />
                        )}
                        <span className="flex items-center gap-2">
                            <span
                                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                                    index < stepIndex
                                        ? "bg-primary-dark text-white"
                                        : index === stepIndex
                                          ? "bg-primary-dark text-white ring-4 ring-primary/40"
                                          : "bg-charcoal/5 text-muted"
                                }`}
                            >
                                {index < stepIndex ? "✓" : index + 1}
                            </span>
                            <span
                                className={`hidden whitespace-nowrap sm:inline ${
                                    index === stepIndex
                                        ? "font-semibold text-charcoal"
                                        : index < stepIndex
                                          ? "text-charcoal"
                                          : "text-muted"
                                }`}
                            >
                                {entry.label}
                            </span>
                        </span>
                    </li>
                ))}
            </ol>

            <Card>
                {step === "service" && (
                    <section>
                        <p className="mb-4 text-sm text-muted">
                            Pick the service the customer wants — you'll choose from
                            qualified staff next.
                        </p>
                        <ul className="grid gap-3 sm:grid-cols-2">
                            {props.services.map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            resetAfterService();
                                            setServiceId(item.id);
                                            setStep("staff");
                                        }}
                                        className="w-full rounded-xl border border-border p-4 text-left transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary-light/30 hover:shadow-lift"
                                    >
                                        <span className="flex w-full items-start justify-between gap-3">
                                            <span>
                                                <span className="block font-medium">
                                                    {item.name}
                                                </span>
                                                <span className="mt-1 block text-xs text-muted">
                                                    {item.duration_minutes} min
                                                </span>
                                            </span>
                                            <span className="text-sm font-semibold text-primary-dark">
                                                {peso(item.price)}
                                            </span>
                                        </span>
                                        {item.description && (
                                            <span className="mt-2 block text-xs text-muted">
                                                {item.description}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {step === "staff" && (
                    <section>
                        <p className="mb-4 text-sm text-muted">
                            {service?.name} · only staff qualified for this service are
                            shown, with their availability today.
                        </p>

                        {staffLoading && (
                            <p className="text-sm text-muted">Loading staff…</p>
                        )}

                        {!staffLoading && staffOptions.length === 0 && (
                            <p className="text-sm text-muted">
                                No active staff member offers this service. Assign it to a
                                staff member first.
                            </p>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                            {staffOptions.map((member) => {
                                const hours = formatScheduleLabel(member.schedule);
                                return (
                                    <button
                                        key={member.staffId}
                                        type="button"
                                        onClick={() => {
                                            setStaffId(member.staffId);
                                            setDate(dateInDays(0));
                                            setMonth(dateInDays(0).slice(0, 7));
                                            setSlot(null);
                                            setMonthDates(null);
                                            setAvailability(null);
                                            setStep("date");
                                        }}
                                        className="rounded-xl border border-border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary-light/30 hover:shadow-lift"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span
                                                aria-hidden
                                                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-light text-sm font-semibold text-primary-dark"
                                            >
                                                {initialsOf(member.staffName)}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block font-medium text-charcoal">
                                                    {member.staffName}
                                                </span>
                                                <span className="mt-0.5 block text-xs text-muted">
                                                    {member.position ?? "Stylist"}
                                                </span>
                                            </span>
                                        </span>
                                        <span className="mt-3 flex flex-wrap items-center gap-2">
                                            <StatusBadge status={member.status} />
                                            {member.reason && (
                                                <span className="text-xs text-muted">
                                                    {member.reason}
                                                </span>
                                            )}
                                        </span>
                                        {hours !== null && (
                                            <span className="mt-2 block text-xs text-muted">
                                                {hours}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 border-t border-border pt-5">
                            <BackButton onClick={() => setStep("service")} />
                        </div>
                    </section>
                )}

                {step === "date" && (
                    <section>
                        <p className="mb-4 text-sm text-muted">
                            Choose a date {selectedStaff ? selectedStaff.staffName : ""} can
                            perform {service?.name}. Days with no open times are disabled.
                        </p>

                        {selectedStaff && (
                            <div className="mb-4 flex items-center gap-2 text-sm">
                                <span className="text-muted">Today:</span>
                                <StatusBadge status={selectedStaff.status} />
                                {selectedStaff.reason && (
                                    <span className="text-xs text-muted">
                                        {selectedStaff.reason}
                                    </span>
                                )}
                            </div>
                        )}

                        <Calendar
                            value={date}
                            onChange={(value) => {
                                setDate(value);
                                setSlot(null);
                                setStep("time");
                            }}
                            month={month}
                            onMonthChange={setMonth}
                            min={dateInDays(0)}
                            available={monthDates}
                        />

                        <div className="mt-6 border-t border-border pt-5">
                            <BackButton onClick={() => setStep("staff")} />
                        </div>
                    </section>
                )}

                {step === "time" && (
                    <section>
                        <p className="mb-4 text-sm text-muted">
                            {service?.name} · {formatDayLabel(date)} ·{" "}
                            {selectedStaff?.staffName}
                            {service ? ` (${service.duration_minutes} min)` : ""}
                        </p>

                        {loading && <p className="text-sm text-muted">Loading times…</p>}

                        {!loading && dayEntry && (
                            <StatusBanner
                                status={dayEntry.status}
                                reason={dayEntry.reason}
                            />
                        )}

                        {!loading && slots.length === 0 && (
                            <p className="text-sm text-muted">
                                No times are available on this date. Choose another day.
                            </p>
                        )}

                        {!loading && slots.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {slots.map((time) => (
                                    <button
                                        key={time}
                                        type="button"
                                        onClick={() => setSlot(time)}
                                        aria-pressed={slot === time}
                                        className={`min-h-11 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                            slot === time
                                                ? "border-primary-dark bg-primary-dark font-medium text-white shadow-sm"
                                                : "border-border bg-surface hover:border-primary hover:bg-primary-light/30"
                                        }`}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                            <BackButton
                                onClick={() => {
                                    setSlot(null);
                                    setStep("date");
                                }}
                            />
                            <button
                                type="button"
                                disabled={!slot}
                                onClick={() => setStep("review")}
                                className="min-h-11 rounded-lg bg-primary-dark px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-press disabled:opacity-40"
                            >
                                Continue
                            </button>
                        </div>
                    </section>
                )}

                {step === "review" && service && (
                    <section>
                        <div className="mb-5 rounded-xl border border-border bg-charcoal/[0.03] p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                                Summary
                            </p>
                            <dl className="space-y-0.5 text-sm">
                                <Row
                                    label="Customer"
                                    value={
                                        [form.firstName, form.lastName]
                                            .filter(Boolean)
                                            .join(" ") || "—"
                                    }
                                />
                                <Row
                                    label="Service"
                                    value={`${service.name} · ${service.duration_minutes} min`}
                                />
                                <Row
                                    label="Staff"
                                    value={selectedStaff?.staffName ?? "—"}
                                />
                                <Row label="Date" value={formatDayLabel(date)} />
                                <Row label="Time" value={slot ?? "—"} />
                                <Row label="Duration" value={`${service.duration_minutes} min`} />
                                <Row label="Price" value={peso(service.price)} />
                            </dl>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field
                                label="First name *"
                                value={form.firstName}
                                onChange={(value) =>
                                    setForm({ ...form, firstName: value })
                                }
                            />
                            <Field
                                label="Last name"
                                value={form.lastName}
                                onChange={(value) => setForm({ ...form, lastName: value })}
                            />
                            <Field
                                label="Phone"
                                value={form.phone}
                                onChange={(value) => setForm({ ...form, phone: value })}
                            />
                            <Field
                                label="Email"
                                value={form.email}
                                onChange={(value) => setForm({ ...form, email: value })}
                            />
                        </div>
                        <p className="mt-2 text-xs text-muted">
                            Provide a phone number or an email address for the customer.
                        </p>

                        <label className="mt-3 block text-sm">
                            <span className="mb-1 block opacity-70">Notes</span>
                            <textarea
                                value={form.notes}
                                onChange={(event) =>
                                    setForm({ ...form, notes: event.target.value })
                                }
                                rows={2}
                                className="w-full rounded-md border border-border bg-transparent px-3 py-2"
                            />
                        </label>

                        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                            <BackButton onClick={() => setStep("time")} />
                            <button
                                type="button"
                                disabled={busy || !canConfirm}
                                aria-busy={busy}
                                onClick={() => void submit()}
                                className="min-h-11 rounded-lg bg-primary-dark px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-press disabled:opacity-40"
                            >
                                {busy ? "Creating…" : "Confirm walk-in booking"}
                            </button>
                        </div>
                    </section>
                )}
            </Card>
        </div>
    );
}
