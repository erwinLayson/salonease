import { useEffect, useMemo, useRef, useState } from "react";
import { api, conflictAlternatives, copyToClipboard } from "../lib/api";
import { toast } from "../lib/toast";
import company_logo from "../../public/company-logo.png"

// Types
import type {
    AppointmentView,
    AvailabilityResponse,
    MonthAvailabilityResponse,
    Service,
    StaffOption,
} from "../types";

// UI components
import { Calendar } from "../components/ui/Calendar";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { BackButton } from "../components/ui/BackButton";
import { Row } from "../components/ui/Row";

// Utilities
import { dateInDays, formatScheduleLabel, peso } from "../lib/utils";

type Step = "service" | "staff" | "slot" | "details" | "done";

interface Confirmation {
    data: AppointmentView;
    manageUrl: string;
}

const STEP_LABELS: Array<{ key: Step; label: string }> = [
    { key: "service", label: "Service" },
    { key: "staff", label: "Staff" },
    { key: "slot", label: "Date & time" },
    { key: "details", label: "Your details" },
];

/** Merges every staff member's open-date counts into one map (any-staff view). */
const unionDates = (
    staff: MonthAvailabilityResponse["staff"]
): Record<string, number> => {
    const union: Record<string, number> = {};
    for (const entry of staff) {
        for (const [key, count] of Object.entries(entry.dates)) {
            union[key] = (union[key] ?? 0) + count;
        }
    }
    return union;
};

/** First open date on or after `fromKey` (`YYYY-MM-DD` keys sort chronologically). */
const datesOnOrAfter = (dates: Record<string, number>, fromKey: string): string | null => {
    for (const key of Object.keys(dates).sort()) {
        if (key >= fromKey) {
            return key;
        }
    }
    return null;
};

/** `2026-10-03` -> `Sat, Oct 3`. */
const formatDayLabel = (key: string): string => {
    const [year = "0", month = "1", day = "1"] = key.split("-");
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
        undefined,
        { weekday: "short", month: "short", day: "numeric" }
    );
};

export default function BookingPage() {
    const [step, setStep] = useState<Step>("service");
    const [services, setServices] = useState<Service[]>([]);
    const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
    const [service, setService] = useState<Service | null>(null);
    const [staffId, setStaffId] = useState<number | null>(null);
    const [date, setDate] = useState<string>(dateInDays(0));
    // Month viewed in the calendar; drives the availability-month fetch.
    const [month, setMonth] = useState<string>(() => dateInDays(0).slice(0, 7));
    const [monthPayload, setMonthPayload] = useState<{
        serviceId: number;
        staff: MonthAvailabilityResponse["staff"];
    } | null>(null);
    const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
    const [slot, setSlot] = useState<string | null>(null);
    const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "" });
    const [errors, setErrors] = useState<{ firstName?: string; contact?: string }>({});
    const [slotError, setSlotError] = useState(false);
    const firstNameRef = useRef<HTMLInputElement>(null);
    const contactRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(false);
    const [alternatives, setAlternatives] = useState<string[]>([]);
    const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
    const [copied, setCopied] = useState(false);

    // Load the active service catalog once.
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get<{ data: Service[] }>("/public/services");
                setServices(res.data.data);
            } catch {
                // Failures surface as a toast via the axios error interceptor.
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, []);

    // Load eligible staff whenever the service changes.
    useEffect(() => {
        if (!service) {
            return;
        }
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get<{ data: StaffOption[] }>("/public/staff", {
                    params: { serviceId: service.id },
                });
                setStaffOptions(res.data.data);
            } catch {
                // Failures surface as a toast via the axios error interceptor.
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [service]);

    // Load availability when the slot step is open.
    useEffect(() => {
        if (step !== "slot" || !service) {
            return;
        }
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get<{ data: AvailabilityResponse }>("/public/availability", {
                    params: {
                        serviceId: service.id,
                        date,
                        ...(staffId ? { staffId } : {}),
                    },
                });
                setAvailability(res.data.data);
                setSlot(null);
            } catch {
                // Failures surface as a toast via the axios error interceptor.
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [step, service, date, staffId]);

    // Load per-date open-time counts for the viewed month — powers the
    // staff-card "next open" chips and the calendar's availability dots.
    useEffect(() => {
        if (step !== "staff" && step !== "slot") {
            return;
        }
        if (!service) {
            return;
        }
        const load = async () => {
            try {
                const res = await api.get<{ data: MonthAvailabilityResponse }>(
                    "/public/availability-month",
                    { params: { serviceId: service.id, month } }
                );
                setMonthPayload({
                    serviceId: service.id,
                    staff: res.data.data.staff,
                });
            } catch {
                // Failures surface as a toast via the axios error interceptor.
            }
        };
        void load();
    }, [step, service, month]);

    // Counts for the current service only (ignores stale payloads).
    const monthStaff = useMemo(
        () =>
            monthPayload !== null && service !== null &&
            monthPayload.serviceId === service.id
                ? monthPayload.staff
                : null,
        [monthPayload, service]
    );

    const todayKey = dateInDays(0);

    // Any-staff view: used by the "First available" card and (when no
    // specific staff is chosen) by the calendar.
    const anyStaffDates = useMemo(
        () => (monthStaff === null ? null : unionDates(monthStaff)),
        [monthStaff]
    );

    // Dates with open times for the choice made on the staff step.
    const openDates = useMemo(() => {
        if (monthStaff === null) {
            return null;
        }
        if (staffId === null) {
            return anyStaffDates;
        }
        return (
            monthStaff.find((entry) => entry.staffId === staffId)?.dates ?? {}
        );
    }, [monthStaff, anyStaffDates, staffId]);

    const earliestOpen =
        anyStaffDates === null
            ? null
            : datesOnOrAfter(anyStaffDates, todayKey);

    // Slot times for a specific staff member on the selected date.
    // When no staff is chosen yet, fall back to all open times for the
    // service that day (the same set the calendar already shows for the
    // current date).
    const currentStaffIds = staffId !== null ? [staffId, null] : null;
    const allIds = availability === null
        ? []
        : currentStaffIds !== null
          ? currentStaffIds
          : availability.staff.map((entry) => entry.staffId);
    const staffSlots: string[] =
        availability === null
            ? []
            : allIds.reduce<string[]>((out, id) => {
                  const entry = availability.staff.find((e) => e.staffId === id);
                  if (!entry) {
                      return out;
                  }
                  for (const slot of entry.slots) {
                      if (!out.includes(slot)) {
                          out.push(slot);
                      }
                  }
                  return out;
              }, [])
                .sort();
    const allSlots = staffSlots;

    const submit = async () => {
        if (!service || !slot) {
            return;
        }

        // Client-side validation mirrors the API rules; focus moves to the first invalid field.
        const nextErrors: { firstName?: string; contact?: string } = {};
        if (!form.firstName.trim()) {
            nextErrors.firstName = "Please enter your first name.";
        }
        if (!form.phone.trim() && !form.email.trim()) {
            nextErrors.contact =
                "Please provide a mobile number or an email address so we can confirm your booking.";
        }
        setErrors(nextErrors);
        if (nextErrors.firstName) {
            firstNameRef.current?.focus();
            return;
        }
        if (nextErrors.contact) {
            contactRef.current?.focus();
            return;
        }

        setBusy(true);
        setAlternatives([]);

        try {
            const res = await api.post<{ data: AppointmentView; manageUrl: string }>(
                "/public/bookings",
                {
                    serviceId: service.id,
                    ...(staffId ? { staffId } : {}),
                    startAt: `${date}T${slot}:00`,
                    firstName: form.firstName,
                    lastName: form.lastName || null,
                    phone: form.phone || null,
                    email: form.email || null,
                }
            );
            toast.success(`Booking ${res.data.data.reference} confirmed.`);
            setConfirmation({ data: res.data.data, manageUrl: res.data.manageUrl });
            setStep("done");
        } catch (err) {
            // A 409 conflict also surfaces as a toast; offer
            // the alternative slots the server returned.
            const alts = conflictAlternatives(err);
            if (alts.length > 0) {
                setAlternatives(alts);
                setStep("slot");
                setSlot(null);
            }
        } finally {
            setBusy(false);
        }
    };

    const stepIndex = STEP_LABELS.findIndex((entry) => entry.key === step);
    const selectedStaffName = staffId
        ? (staffOptions.find((s) => s.staffId === staffId)?.staffName ?? "Staff")
        : "First available";
    const stepTitle =
        step === "service"
            ? "Choose a service"
            : step === "staff"
              ? "Choose a staff member"
              : step === "slot"
                ? "Pick a date and time"
                : step === "details"
                  ? "Your details"
                  : undefined;
    const showStaffSummary =
        step === "slot" || step === "details" || step === "done";

    return (
        <div className="flex min-h-svh w-full flex-col bg-background lg:h-svh lg:overflow-hidden">
            {/* Slim page bar — the site Navbar/Footer are intentionally omitted here. */}
            <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2 sm:px-6">
                <a
                    href="/"
                    className="flex min-h-11 items-center gap-2.5 rounded-lg pr-2 transition-opacity hover:opacity-80"
                >
                    <div className="relative max-w-16 max-h-16 overflow-hidden">
                        <img src={company_logo} alt="Company-logo" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight">
                        Raheem Make Up Studio{" "}
                        <span className="hidden sm:inline">and Salon</span>
                    </span>
                </a>
                <a
                    href="/manage"
                    className="inline-flex min-h-11 items-center px-2 text-sm text-muted transition-colors hover:text-primary-dark"
                >
                    Manage a booking
                </a>
            </div>

            <div className="flex w-full flex-1 flex-col lg:min-h-0 lg:flex-row lg:overflow-hidden">
                {/* Sidebar: page heading + live booking summary */}
                <aside className="contents lg:flex lg:w-80 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-border lg:bg-surface lg:px-6 lg:py-10 xl:w-96">
                    <div className="border-b border-border bg-surface px-4 py-6 sm:px-6 lg:border-b-0 lg:bg-transparent lg:px-0 lg:py-0">
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                            Book your appointment
                        </h1>
                        <p className="mt-2 text-sm text-muted">
                            No account needed — pick a service, your stylist, and a time
                            that works for you.
                        </p>
                    </div>

                    <div className="sticky top-0 z-20 border-b border-border bg-background px-4 py-3 sm:px-6 lg:static lg:mt-5 lg:border-b-0 lg:bg-transparent lg:px-0 lg:py-0">
                        <section className="rounded-2xl border border-border bg-surface p-3 shadow-card sm:p-4 lg:p-5">
                            <div className="mb-2 flex items-center justify-between gap-3 border-b border-border pb-2 lg:mb-4 lg:pb-3">
                                <h2 className="text-sm font-semibold tracking-tight lg:text-base">
                                    Your booking
                                </h2>
                            </div>
                            {service === null ? (
                                <p className="text-sm text-muted">
                                    Start by choosing a service.
                                </p>
                            ) : (
                                <dl className="space-y-0.5 text-sm lg:space-y-1">
                                    <Row
                                        label="Service"
                                        value={`${service.name} · ${service.durationMinutes} min`}
                                    />
                                    {showStaffSummary && (
                                        <Row label="Staff" value={selectedStaffName} />
                                    )}
                                    {slot !== null && (
                                        <Row label="When" value={`${date} at ${slot}`} />
                                    )}
                                    <Row label="Price" value={peso(service.price)} />
                                </dl>
                            )}
                            <p className="mt-2 hidden text-xs text-muted lg:mt-3 lg:block">
                                You'll get a private link to manage or cancel this
                                booking.
                            </p>
                        </section>
                    </div>
                </aside>

                {/* Main: progress stepper + active step */}
                <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:px-10 lg:py-10 xl:px-14">
                    {step !== "done" && (
                        <ol
                            className="mb-6 flex items-center text-xs sm:text-sm"
                            aria-label="Booking progress"
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
                                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors ${
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
                    )}

                    <Card title={stepTitle}>
                        {loading && (
                            <p className="mb-4 text-sm text-muted">Loading…</p>
                        )}

                        {step === "service" && !loading && (
                            <section>
                                <p className="mb-4 text-sm text-muted">
                                    Pick a service to get started — you'll choose your
                                    stylist next.
                                </p>
                                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {services.map((item) => (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setService(item);
                                                    setStaffId(null);
                                                    setSlot(null);
                                                    setStep("staff");
                                                }}
                                                className="w-full rounded-xl border border-border p-5 text-left transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary-light/30 hover:shadow-lift"
                                            >
                                                <span className="flex w-full items-start justify-between gap-3">
                                                    <span>
                                                        <span className="block font-medium">
                                                            {item.name}
                                                        </span>
                                                        <span className="mt-1 block text-xs text-muted">
                                                            {item.durationMinutes} min
                                                        </span>
                                                    </span>
                                                    <span className="text-sm font-semibold text-primary-dark">
                                                        {peso(item.price)}
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                {services.length === 0 && (
                                    <p className="text-sm text-muted">
                                        No services are available right now.
                                    </p>
                                )}
                            </section>
                        )}

                        {step === "staff" && (
                            <section>
                                <p className="mb-4 text-sm text-muted">
                                    Choose a specific stylist, or let us pick the first
                                    available one.
                                </p>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStaffId(null);
                                            setStep("slot");
                                        }}
                                        className="rounded-xl border border-primary-light/60 bg-primary-light/25 p-5 text-left transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary-light/40 hover:shadow-lift"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span
                                                aria-hidden
                                                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-dark text-lg text-white"
                                            >
                                                ✦
                                            </span>
                                            <span>
                                                <span className="block font-medium">
                                                    First available
                                                </span>
                                                <span className="mt-0.5 block text-xs text-muted">
                                                    We'll match you with whoever is free
                                                    soonest
                                                </span>
                                            </span>
                                        </span>
                                        {anyStaffDates !== null && (
                                            <span
                                                className={`mt-3 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                                                    earliestOpen !== null
                                                        ? "border-success-line bg-success-bg text-success"
                                                        : "border-border bg-charcoal/5 text-muted"
                                                }`}
                                            >
                                                {earliestOpen !== null
                                                    ? `Earliest: ${formatDayLabel(earliestOpen)}`
                                                    : "No open times this month"}
                                            </span>
                                        )}
                                    </button>
                                    {staffOptions.map((option) => {
                                        const hours = formatScheduleLabel(
                                            option.schedule ?? []
                                        );
                                        const nextOpen =
                                            monthStaff === null
                                                ? null
                                                : datesOnOrAfter(
                                                      monthStaff.find(
                                                          (entry) =>
                                                              entry.staffId ===
                                                              option.staffId
                                                      )?.dates ?? {},
                                                      todayKey
                                                  );
                                        const initials = option.staffName
                                            .split(/\s+/)
                                            .map((part) => part[0] ?? "")
                                            .filter(Boolean)
                                            .slice(0, 2)
                                            .join("")
                                            .toUpperCase();

                                        return (
                                            <button
                                                key={option.staffId}
                                                type="button"
                                                onClick={() => {
                                                    setStaffId(option.staffId);
                                                    setStep("slot");
                                                }}
                                                className="rounded-xl border border-border bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary-light/30 hover:shadow-lift"
                                            >
                                                <span className="flex items-center gap-3">
                                                    <span
                                                        aria-hidden
                                                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-light text-sm font-semibold text-primary-dark"
                                                    >
                                                        {initials}
                                                    </span>
                                                    <span>
                                                        <span className="block font-medium text-charcoal">
                                                            {option.staffName}
                                                        </span>
                                                        <span className="mt-0.5 block text-xs text-muted">
                                                            {option.position ?? "Stylist"}
                                                        </span>
                                                    </span>
                                                </span>
                                                {hours !== null && (
                                                    <span className="mt-3 block text-xs text-muted">
                                                        {hours}
                                                    </span>
                                                )}
                                                {monthStaff !== null && (
                                                    <span
                                                        className={`mt-3 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                                                            nextOpen !== null
                                                                ? "border-success-line bg-success-bg text-success"
                                                                : "border-border bg-charcoal/5 text-muted"
                                                        }`}
                                                    >
                                                        {nextOpen !== null
                                                            ? `Next open: ${formatDayLabel(nextOpen)}`
                                                            : "No open times this month"}
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

                        {step === "slot" && (
                            <section>
                                <p className="mb-4 text-sm text-muted">
                                    Choose a date, then pick one of the available times.
                                </p>
                                <div className="mb-5">
                                    <span className="mb-2 block text-sm font-medium text-charcoal">
                                        Date
                                    </span>
                                    <Calendar
                                        value={date}
                                        onChange={setDate}
                                        month={month}
                                        onMonthChange={setMonth}
                                        min={dateInDays(0)}
                                        available={openDates}
                                    />
                                </div>

                                {alternatives.length > 0 && (
                                    <div className="mb-5 rounded-lg border border-warning-line bg-warning-bg p-4 text-sm">
                                        <p className="font-medium">
                                            Other times available that day:
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {alternatives
                                                .filter((time) => staffSlots.includes(time))
                                                .map((time) => (
                                                    <button
                                                        key={time}
                                                        type="button"
                                                        onClick={() => {
                                                            setSlot(time);
                                                            setSlotError(false);
                                                        }}
                                                        aria-pressed={slot === time}
                                                        className={`min-h-11 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                                            slot === time
                                                                ? "border-primary-dark bg-primary-dark font-medium text-white"
                                                                : "border-border bg-surface hover:border-primary hover:bg-primary-light/30"
                                                        }`}
                                                    >
                                                        {time}
                                                    </button>
                                                ))}
                                        </div>
                                        {staffSlots.filter((time) => alternatives.includes(time)).length === 0 && (
                                            <p className="mt-2 text-xs text-muted">
                                                None of those times are available for the
                                                selected staff.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {!loading && staffSlots.length === 0 && (
                                    <p className="text-sm text-muted">
                                        {staffId !== null
                                            ? `No times are available for this staff member on this date. Try another day.`
                                            : `No times are available on this date. Try another day.`}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {allSlots.map((time) => (
                                        <button
                                            key={time}
                                            type="button"
                                            onClick={() => {
                                                setSlot(time);
                                                setSlotError(false);
                                            }}
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

                                {slotError && !slot && (
                                    <p
                                        aria-live="polite"
                                        className="mt-3 flex items-start gap-1.5 text-sm font-medium text-danger"
                                    >
                                        <span aria-hidden className="mt-0.5">
                                            !
                                        </span>
                                        Please select a time to continue.
                                    </p>
                                )}

                                <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                                    <BackButton onClick={() => setStep("staff")} />
                                    <button
                                        type="button"
                                        disabled={!date}
                                        onClick={() => {
                                            if (!slot) {
                                                setSlotError(true);
                                                return;
                                            }
                                            setSlotError(false);
                                            setStep("details");
                                        }}
                                        className="min-h-11 rounded-lg bg-primary-dark px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-press disabled:opacity-40"
                                    >
                                        Continue
                                    </button>
                                </div>
                            </section>
                        )}

                        {step === "details" && service && (
                            <section>
                                <div className="mb-5 rounded-lg border border-primary-light/60 bg-primary-light/30 px-4 py-3 text-sm text-charcoal">
                                    {service.name} · {date} at {slot} ·{" "}
                                    {selectedStaffName}
                                </div>

                                <form
                                    className="grid max-w-3xl gap-4 sm:grid-cols-2"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        void submit();
                                    }}
                                >
                                    <Field
                                        label="First name *"
                                        value={form.firstName}
                                        error={errors.firstName}
                                        setInputRef={(element) => {
                                            firstNameRef.current = element;
                                        }}
                                        onChange={(value) => {
                                            setForm({ ...form, firstName: value });
                                            if (errors.firstName) {
                                                setErrors({
                                                    ...errors,
                                                    firstName: undefined,
                                                });
                                            }
                                        }}
                                    />
                                    <Field
                                        label="Last name"
                                        value={form.lastName}
                                        onChange={(value) =>
                                            setForm({ ...form, lastName: value })
                                        }
                                    />
                                    <Field
                                        label="Mobile number"
                                        value={form.phone}
                                        error={errors.contact}
                                        setInputRef={(element) => {
                                            contactRef.current = element;
                                        }}
                                        onChange={(value) => {
                                            setForm({ ...form, phone: value });
                                            if (errors.contact) {
                                                setErrors({ ...errors, contact: undefined });
                                            }
                                        }}
                                    />
                                    <Field
                                        label="Email"
                                        value={form.email}
                                        onChange={(value) =>
                                            setForm({ ...form, email: value })
                                        }
                                    />

                                    <p className="text-xs text-muted sm:col-span-2">
                                        Please provide a mobile number or an email
                                        address so we can confirm your booking.
                                    </p>

                                    <div className="mt-1 flex items-center justify-between border-t border-border pt-5 sm:col-span-2">
                                        <BackButton onClick={() => setStep("slot")} />
                                        <button
                                            type="submit"
                                            disabled={busy}
                                            aria-busy={busy}
                                            className="min-h-11 rounded-lg bg-primary-dark px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-press disabled:opacity-40"
                                        >
                                            {busy ? "Booking…" : "Confirm booking"}
                                        </button>
                                    </div>
                                </form>
                            </section>
                        )}

                        {step === "done" && confirmation && (
                            <section>
                                <div className="mb-5 flex flex-col items-center text-center">
                                    <span
                                        aria-hidden
                                        className="grid h-14 w-14 place-items-center rounded-full bg-success-bg text-2xl font-bold text-success"
                                    >
                                        ✓
                                    </span>
                                    <h2 className="mt-4 text-xl font-semibold tracking-tight text-success">
                                        Booking confirmed
                                    </h2>
                                    <p className="mt-1 text-sm text-muted">
                                        Reference{" "}
                                        <strong>{confirmation.data.reference}</strong>
                                    </p>
                                </div>

                                <dl className="mb-6 max-w-2xl space-y-1 text-sm">
                                    <Row
                                        label="Service"
                                        value={confirmation.data.serviceName}
                                    />
                                    <Row label="Staff" value={confirmation.data.staffName} />
                                    <Row
                                        label="When"
                                        value={new Date(
                                            confirmation.data.startAt
                                        ).toLocaleString()}
                                    />
                                    <Row
                                        label="Name"
                                        value={confirmation.data.customerName}
                                    />
                                    <Row
                                        label="Total"
                                        value={peso(confirmation.data.price)}
                                    />
                                </dl>

                                <div className="max-w-2xl rounded-xl border border-border bg-charcoal/[0.03] p-4">
                                    <p className="text-sm font-medium">
                                        Manage this booking
                                    </p>
                                    <p className="mt-1 text-xs text-muted">
                                        Keep this private link to cancel or request a
                                        reschedule.
                                    </p>
                                    <code className="mt-2 block break-all rounded-lg bg-charcoal/5 p-2 text-xs">
                                        {confirmation.manageUrl}
                                    </code>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                // jsPDF is heavy — load it only when asked.
                                                const { downloadReceipt } =
                                                    await import(
                                                        "../lib/receipt"
                                                    );
                                                downloadReceipt(
                                                    confirmation.data,
                                                    confirmation.manageUrl
                                                );
                                            }}
                                            className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-xs font-medium transition-colors hover:bg-charcoal/5"
                                        >
                                            Download O.R.
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setCopied(
                                                    await copyToClipboard(
                                                        confirmation.manageUrl
                                                    )
                                                );
                                            }}
                                            className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-xs transition-colors hover:bg-charcoal/5"
                                        >
                                            {copied ? "Copied!" : "Copy link"}
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}
                    </Card>
                </main>
            </div>
        </div>
    );
}
