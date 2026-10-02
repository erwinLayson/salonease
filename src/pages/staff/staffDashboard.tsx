import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { toast } from "../../lib/toast";

// UI components
import { Calendar } from "../../components/ui/Calendar";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { StatusAction } from "../../components/owner/StatusAction";
import { PaymentControls } from "../../components/PaymentControls";

// Types
import type { AppointmentDetail, ScheduleDay, ScheduleView } from "../../types";
import type { CalendarDayStatus } from "../../components/ui/Calendar";

// Utilities
import { dateInDays, formatDateTime, peso } from "../../lib/utils";

/** Local `YYYY-MM-DD` for a date-time string (appointments render in local time). */
const localDateKey = (value: string): string => {
    const date = new Date(value);
    const pad = (n: number): string => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Number of days in a `YYYY-MM` month. */
const daysInMonth = (month: string): number =>
    new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();

/**
 * Completed and paid — settled, so it drops off the calendar
 * (badges and the day's list alike).
 */
const isSettled = (appointment: AppointmentDetail): boolean =>
    appointment.status === "completed" && appointment.paymentStatus === "paid";

/** Summary status of a day (closure beats leave beats working). */
const dayStatus = (day: ScheduleDay): CalendarDayStatus =>
    day.exceptions.some((exception) => exception.type === "closure")
        ? "closure"
        : day.exceptions.some((exception) => exception.type === "leave")
          ? "leave"
          : day.isWorkingDay
            ? "working"
            : "off";

/** `2026-10-03` -> `Saturday, October 3, 2026`. */
const formatFullDate = (key: string): string => {
    const [year = "0", month = "1", day = "1"] = key.split("-");
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
        undefined,
        { weekday: "long", month: "long", day: "numeric", year: "numeric" }
    );
};

export default function StaffDashboard() {
    const [date, setDate] = useState(dateInDays(0));
    const [month, setMonth] = useState(() => dateInDays(0).slice(0, 7));
    const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
    const [monthCounts, setMonthCounts] = useState<Record<string, number> | null>(null);
    const [schedule, setSchedule] = useState<ScheduleView | null>(null);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);

    // Appointments for the selected day (the list under the calendar).
    const loadDay = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<{ data: AppointmentDetail[] }>("/staff/appointments", {
                params: { date },
            });
            // Settled (completed + paid) appointments no longer show here.
            setAppointments(res.data.data.filter((a) => !isSettled(a)));
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        void loadDay();
    }, [loadDay]);

    // Every unsettled appointment in the viewed month → count badges on
    // the calendar. Extracted so payment saves can refresh the counts.
    const loadMonthCounts = useCallback(async () => {
        try {
            const res = await api.get<{ data: AppointmentDetail[] }>("/staff/appointments", {
                params: {
                    from: `${month}-01`,
                    to: `${month}-${daysInMonth(month)}`,
                },
            });
            const counts: Record<string, number> = {};
            for (const appointment of res.data.data) {
                if (isSettled(appointment)) {
                    continue;
                }
                const key = localDateKey(appointment.startAt);
                counts[key] = (counts[key] ?? 0) + 1;
            }
            setMonthCounts(counts);
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        }
    }, [month]);

    useEffect(() => {
        void loadMonthCounts();
    }, [loadMonthCounts]);

    /**
     * Staff may confirm a pending booking and complete a confirmed one.
     * Completing auto-creates the billing transaction server-side.
     */
    const changeStatus = async (
        appointment: AppointmentDetail,
        status: "confirmed" | "completed"
    ): Promise<void> => {
        setBusyId(appointment.id);
        try {
            await api.patch(`/staff/appointments/${appointment.id}/status`, {
                status,
            });
            toast.success(
                `${appointment.reference} marked as ${
                    status === "completed" ? "completed" : "confirmed"
                }.`
            );
            await loadDay();
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setBusyId(null);
        }
    };

    // Working/leave schedule for the viewed month (calendar colours and
    // the selected day's hours strip).
    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get<{ data: ScheduleView }>("/staff/schedule", {
                    params: { view: "month", date: `${month}-01` },
                });
                setSchedule(res.data.data);
            } catch {
                // Failures surface as a toast via the axios error interceptor.
            }
        };
        void load();
    }, [month]);

    // Calendar day colours derived from the loaded schedule month.
    const dayStatuses = useMemo(() => {
        const statuses: Record<string, CalendarDayStatus> = {};
        for (const member of schedule?.staff ?? []) {
            for (const day of member.days) {
                statuses[day.date] = dayStatus(day);
            }
        }
        return statuses;
    }, [schedule]);

    // The selected date's own row — the staff scope returns only the caller.
    const selectedDay = useMemo(() => {
        for (const member of schedule?.staff ?? []) {
            const day = member.days.find((entry) => entry.date === date);
            if (day) {
                return day;
            }
        }
        return null;
    }, [schedule, date]);

    const goToToday = () => {
        const today = dateInDays(0);
        setDate(today);
        setMonth(today.slice(0, 7));
    };

    return (
        <div className="grid gap-6">
            <header>
                <h1 className="text-xl font-semibold tracking-tight">My appointments</h1>
                <p className="mt-1 text-sm text-muted">
                    Browse the calendar to see your schedule for each day.
                </p>
            </header>

            <Card title="Appointment calendar">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <Calendar
                        value={date}
                        onChange={setDate}
                        month={month}
                        onMonthChange={setMonth}
                        marks={monthCounts}
                        status={dayStatuses}
                    />
                    <div className="flex flex-col items-start gap-2">
                        <button
                            type="button"
                            onClick={goToToday}
                            className="min-h-11 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-charcoal/5"
                        >
                            Today
                        </button>
                        <p className="text-xs text-muted">
                            Badged days have bookings — tap one to see them.
                        </p>
                    </div>
                </div>
            </Card>

            <Card title={`Appointments (${appointments.length})`}>
                <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <p className="text-sm text-muted">{formatFullDate(date)}</p>
                    {selectedDay && (
                        <p className="text-xs text-muted">
                            {selectedDay.isWorkingDay
                                ? `Working ${
                                      selectedDay.windows
                                          .map((w) => `${w.startTime}–${w.endTime}`)
                                          .join(", ") || "—"
                                  }`
                                : "Day off"}
                            {selectedDay.exceptions.map((exception, index) => (
                                <span key={index} className="ml-3 text-warning">
                                    {exception.type === "closure" ? "Closure" : "Leave"}{" "}
                                    {exception.startTime}–{exception.endTime}
                                    {exception.reason ? ` · ${exception.reason}` : ""}
                                </span>
                            ))}
                        </p>
                    )}
                </div>
                {loading && (
                    <p className="py-4 text-center text-sm text-muted">
                        Loading…
                    </p>
                )}
                {!loading && appointments.length === 0 && (
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
                            >
                                <rect x="3" y="5" width="18" height="16" rx="2" />
                                <path d="M3 9h18M8 3v4M16 3v4" />
                            </svg>
                        </span>
                        <p className="mt-3 text-sm font-medium">No appointments this day</p>
                        <p className="mt-1 text-xs text-muted">
                            Pick another date to see more bookings.
                        </p>
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
                                <span className="ml-auto rounded-lg bg-primary-light px-2.5 py-1 text-xs font-medium text-charcoal">
                                    {formatDateTime(appointment.startAt)}
                                </span>
                            </div>
                            <p className="mt-2 text-sm">
                                <span className="text-muted">
                                    Customer:{" "}
                                </span>
                                {appointment.customer.name}
                                {appointment.customer.phone
                                    ? ` · ${appointment.customer.phone}`
                                    : ""}
                            </p>
                            <p className="text-sm">
                                <span className="text-muted">Service: </span>
                                {appointment.service.name} · {peso(appointment.price)}
                            </p>
                            {appointment.notes && (
                                <p className="mt-2 whitespace-pre-line rounded-lg bg-charcoal/5 p-2 text-xs">
                                    {appointment.notes}
                                </p>
                            )}

                            {/* Staff actions: confirm, then complete. */}
                            {(appointment.status === "pending" ||
                                appointment.status === "confirmed") && (
                                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                                    {appointment.status === "pending" && (
                                        <StatusAction
                                            label="Confirm"
                                            disabled={busyId === appointment.id}
                                            onClick={() =>
                                                void changeStatus(
                                                    appointment,
                                                    "confirmed"
                                                )
                                            }
                                        />
                                    )}
                                    {appointment.status === "confirmed" && (
                                        <StatusAction
                                            label="Complete"
                                            disabled={busyId === appointment.id}
                                            onClick={() =>
                                                void changeStatus(
                                                    appointment,
                                                    "completed"
                                                )
                                            }
                                        />
                                    )}
                                </div>
                            )}

                            {/* Completed: record how the customer paid. */}
                            {appointment.status === "completed" && (
                                <div className="mt-3 border-t border-border pt-3">
                                    <PaymentControls
                                        appointmentId={appointment.id}
                                        onSaved={() => {
                                            // Marking paid settles the
                                            // appointment: refresh the list
                                            // and the calendar badges.
                                            void loadDay();
                                            void loadMonthCounts();
                                        }}
                                    />
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
    );
}
