import { useMemo } from "react";

// UI components
import { StatusBadge } from "../ui/StatusBadge";

// Types
import type { ScheduleView } from "../../types";

// Utilities
import { formatClock12 } from "../../lib/utils";
import { getAppointmentsByDate } from "../../lib/schedule";

/**
 * Read-only schedule for the calendar's selected date. Updates
 * immediately when the selection changes; owners get a "Manage day"
 * action that opens the full day-management modal.
 */
export function DailySchedule(props: {
    date: string;
    view: ScheduleView | null;
    loading: boolean;
    error: boolean;
    /** Opens the day management modal (owner scope only). */
    onManage?: () => void;
}) {
    const appointments = useMemo(
        () => getAppointmentsByDate(props.view, props.date),
        [props.view, props.date]
    );

    return (
        <section
            className="rounded-xl border border-border bg-surface p-3 sm:p-4"
            aria-live="polite"
        >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="text-base font-semibold tracking-tight">
                        {formatDayHeader(props.date)}
                    </h3>
                    <p className="text-xs text-muted">Today's Schedule</p>
                </div>
                {props.onManage && (
                    <button
                        type="button"
                        onClick={props.onManage}
                        disabled={props.loading}
                        className="min-h-11 rounded-lg border border-border px-3 text-xs font-medium transition-colors hover:bg-charcoal/5 disabled:opacity-50"
                    >
                        Manage day
                    </button>
                )}
            </div>

            {props.loading ? (
                <p className="py-8 text-center text-sm text-muted">
                    Loading schedule…
                </p>
            ) : props.error ? (
                <p className="py-8 text-center text-sm text-muted">
                    Unable to load this day's appointments. Please try again.
                </p>
            ) : appointments.length === 0 ? (
                <div className="py-8 text-center">
                    <p className="text-sm font-medium">
                        No appointments scheduled
                    </p>
                    <p className="mt-1 text-sm text-muted">
                        There are no confirmed or completed appointments for
                        this date.
                    </p>
                </div>
            ) : (
                // The list scrolls within its own area so a busy
                // day does not make the whole page grow.
                <ul className="grid max-h-[26rem] gap-2 overflow-y-auto">
                    {appointments.map((appointment) => (
                        <li
                            key={appointment.id}
                            className="rounded-xl border border-border p-3"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold">
                                    {formatClock12(appointment.startTime)}
                                </span>
                                <StatusBadge status={appointment.status} />
                            </div>
                            <p className="mt-1.5 text-sm font-medium">
                                {appointment.serviceName}
                            </p>
                            <p className="text-xs text-muted">
                                {appointment.customerName}
                            </p>
                            <p className="text-xs text-muted">
                                Staff: {appointment.staffName}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/** `2026-10-05` -> `Monday, October 5`. */
const formatDayHeader = (key: string): string => {
    const [year = "0", month = "1", day = "1"] = key.split("-");
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
        undefined,
        { weekday: "long", month: "long", day: "numeric" }
    );
};
