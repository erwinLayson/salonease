import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

// UI components
import { Card } from "../../components/ui/Card";
import { Calendar } from "../../components/ui/Calendar";

// Feature components
import { DailySchedule } from "../../components/owner/DailySchedule";
import {
    ScheduleDayModal,
    type ScheduleDayEntry,
} from "../../components/owner/ScheduleDayModal";

// Types
import type { OwnerStaff, ScheduleDay, ScheduleView } from "../../types";
import type { CalendarDayStatus } from "../../components/ui/Calendar";

// Utilities
import { dateInDays } from "../../lib/utils";
import { isScheduledStatus } from "../../lib/schedule";

/** Summary status of a staff member's day (closure beats leave beats working). */
const dayStatus = (day: ScheduleDay): CalendarDayStatus =>
    day.exceptions.some((exception) => exception.type === "closure")
        ? "closure"
        : day.exceptions.some((exception) => exception.type === "leave")
          ? "leave"
          : day.isWorkingDay
            ? "working"
            : "off";

const STATUS_RANK: Record<CalendarDayStatus, number> = {
    off: 0,
    working: 1,
    leave: 2,
    closure: 3,
};

/**
 * Monthly schedule calendar for owners and staff. Selecting a date
 * shows that day's appointments in the side panel; owners can open
 * day management to block time or add leave for a staff member.
 */
export default function SchedulePage(props: { scope: "owner" | "staff" }) {
    const today = dateInDays(0);
    const [month, setMonth] = useState(() => today.slice(0, 7));
    const [date, setDate] = useState(today);
    const [staff, setStaff] = useState<OwnerStaff[]>([]);
    const [schedule, setSchedule] = useState<ScheduleView | null>(null);
    const [dayView, setDayView] = useState<ScheduleView | null>(null);
    const [dayLoading, setDayLoading] = useState(true);
    const [dayError, setDayError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [dayOpen, setDayOpen] = useState(false);

    // Staff directory for the day-management modal; the staff portal
    // is always scoped server-side.
    useEffect(() => {
        if (props.scope !== "owner") {
            return;
        }
        const load = async () => {
            try {
                const res = await api.get<{ data: OwnerStaff[] }>("/owner/staff");
                setStaff(res.data.data.filter((member) => member.is_active === 1));
            } catch {
                // Failures surface as a toast via the axios error interceptor.
            }
        };
        void load();
    }, [props.scope]);

    // Load the whole viewed month so the calendar can colour every day.
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const path =
                    props.scope === "owner" ? "/owner/schedule" : "/staff/schedule";
                const res = await api.get<{ data: ScheduleView }>(path, {
                    params: {
                        view: "month",
                        date: `${month}-01`,
                    },
                });
                setSchedule(res.data.data);
            } catch {
                // Failures surface as a toast via the axios error interceptor.
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [props.scope, month, refreshKey]);

    // The selected date's own view, so the side panel reacts to the
    // selection immediately — even for dates outside the viewed month.
    useEffect(() => {
        let stale = false;
        const load = async () => {
            setDayLoading(true);
            setDayError(false);
            try {
                const path =
                    props.scope === "owner" ? "/owner/schedule" : "/staff/schedule";
                const res = await api.get<{ data: ScheduleView }>(path, {
                    params: { view: "day", date },
                });
                if (!stale) {
                    setDayView(res.data.data);
                }
            } catch {
                if (!stale) {
                    setDayError(true);
                }
            } finally {
                if (!stale) {
                    setDayLoading(false);
                }
            }
        };
        void load();
        return () => {
            stale = true;
        };
    }, [props.scope, date, refreshKey]);

    // Appointment counts, colour status, and per-status staff counts per date.
    const { counts, statuses, breakdown } = useMemo(() => {
        const nextCounts: Record<string, number> = {};
        const nextStatuses: Record<string, CalendarDayStatus> = {};
        const nextBreakdown: Record<
            string,
            Partial<Record<CalendarDayStatus, number>>
        > = {};

        for (const member of schedule?.staff ?? []) {
            for (const day of member.days) {
                // Only confirmed/completed appointments count towards
                // the calendar badges — the same ones the side panel shows.
                nextCounts[day.date] =
                    (nextCounts[day.date] ?? 0) +
                    day.appointments.filter((appointment) =>
                        isScheduledStatus(appointment.status)
                    ).length;

                const status = dayStatus(day);

                // How many staff share each status on this day (hover breakdown).
                const dayBreakdown = (nextBreakdown[day.date] ??= {});
                dayBreakdown[status] = (dayBreakdown[status] ?? 0) + 1;

                const current = nextStatuses[day.date];
                if (current === undefined || STATUS_RANK[status] > STATUS_RANK[current]) {
                    nextStatuses[day.date] = status;
                }
            }
        }

        return { counts: nextCounts, statuses: nextStatuses, breakdown: nextBreakdown };
    }, [schedule]);

    // The selected date's per-staff entries (passed to the management modal).
    const entries = useMemo<ScheduleDayEntry[]>(() => {
        if (!dayView) {
            return [];
        }
        return dayView.staff
            .map((member) => {
                const day = member.days.find((entry) => entry.date === date);
                return day
                    ? {
                          staffId: member.staffId,
                          staffName: member.staffName,
                          position: member.position,
                          day,
                      }
                    : null;
            })
            .filter((entry): entry is ScheduleDayEntry => entry !== null);
    }, [dayView, date]);

    return (
        <div className="grid gap-6">
            <header>
                <h1 className="text-xl font-semibold tracking-tight">Schedule</h1>
                <p className="mt-1 text-sm text-muted">
                    {props.scope === "owner"
                        ? "Click a date to see that day's schedule."
                        : "Browse the calendar to see your working hours, leaves and appointments."}
                </p>
            </header>

            <Card title="Calendar">
                {/* `items-start` keeps the two panels at their own
                    natural heights — the calendar must not stretch to
                    match a tall daily schedule. */}
                <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <Calendar
                        value={date}
                        onChange={setDate}
                        month={month}
                        onMonthChange={setMonth}
                        marks={counts}
                        status={statuses}
                        statusBreakdown={breakdown}
                    />

                    <DailySchedule
                        date={date}
                        view={dayView}
                        loading={dayLoading}
                        error={dayError}
                        onManage={
                            props.scope === "owner"
                                ? () => setDayOpen(true)
                                : undefined
                        }
                    />
                </div>

                {loading && (
                    <p className="mt-4 text-center text-sm text-muted">Loading…</p>
                )}
            </Card>

            {!loading && schedule && schedule.staff.length === 0 && (
                <div className="py-10 text-center text-sm text-muted">
                    No staff to show.
                </div>
            )}

            {dayOpen && (
                <ScheduleDayModal
                    date={date}
                    staff={staff}
                    entries={entries}
                    scope={props.scope}
                    onClose={() => setDayOpen(false)}
                    onChanged={() => setRefreshKey((key) => key + 1)}
                />
            )}
        </div>
    );
}
