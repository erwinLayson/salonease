import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { toast } from "../../lib/toast";

// UI components
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Modal } from "../ui/Modal";
import { StatusBadge } from "../ui/StatusBadge";

// Feature components
import { AppointmentDrawer } from "./AppointmentDrawer";
import { BlockTimeModal } from "./BlockTimeModal";

// Types
import type { OwnerStaff, ScheduleDay, ScheduleException } from "../../types";
import type { CalendarDayStatus } from "../ui/Calendar";

const STATUS_TEXT: Record<CalendarDayStatus, string> = {
    working: "Working",
    off: "Day off",
    leave: "Leave",
    closure: "Closed",
};

const STATUS_BADGE: Record<CalendarDayStatus, string> = {
    working: "bg-success-bg text-success",
    off: "bg-charcoal/10 text-charcoal",
    leave: "bg-warning-bg text-warning",
    closure: "bg-danger-bg text-danger",
};

/** Summary status of a staff member's day (closure beats leave beats working). */
const dayStatus = (day: ScheduleDay): CalendarDayStatus =>
    day.exceptions.some((exception) => exception.type === "closure")
        ? "closure"
        : day.exceptions.some((exception) => exception.type === "leave")
          ? "leave"
          : day.isWorkingDay
            ? "working"
            : "off";

const pad2 = (value: number): string => String(value).padStart(2, "0");

/** `2026-10-03` -> `Saturday, October 3, 2026`. */
const formatFullDate = (key: string): string => {
    const [year = "0", month = "1", day = "1"] = key.split("-");
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
        undefined,
        { weekday: "long", month: "long", day: "numeric", year: "numeric" }
    );
};

/** The `YYYY-MM-DD` after the given date. */
const nextDayOf = (date: string): string => {
    const next = new Date(`${date}T00:00:00`);
    next.setDate(next.getDate() + 1);
    return `${next.getFullYear()}-${pad2(next.getMonth() + 1)}-${pad2(next.getDate())}`;
};

/** `HH:mm` (local) of an ISO timestamp from the API. */
const clockOf = (value: string): string => new Date(value).toTimeString().slice(0, 5);

export interface ScheduleDayEntry {
    staffId: number;
    staffName: string;
    position: string | null;
    day: ScheduleDay;
}

/**
 * Opened by clicking a date on the schedule calendar. Shows every staff
 * member's hours, leaves and appointments for that day, with an expandable
 * "View details" panel, closure creation, and block removal.
 */
export function ScheduleDayModal(props: {
    date: string;
    staff: OwnerStaff[];
    entries: ScheduleDayEntry[];
    /** Owner manages closures; staff only view and take actions. */
    scope?: "owner" | "staff";
    onClose: () => void;
    /** Schedule data changed — parent reloads the calendar. */
    onChanged: () => void | Promise<void>;
}) {
    const scope = props.scope ?? "owner";
    const [expanded, setExpanded] = useState<number | null>(null);
    const [blockOpen, setBlockOpen] = useState(false);
    const [detailId, setDetailId] = useState<number | null>(null);
    const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
    const [removing, setRemoving] = useState<ScheduleException | null>(null);
    const [removeBusy, setRemoveBusy] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Exception ids aren't part of the schedule view, so fetch them for the day.
    // Owners only — the staff scope has no block management.
    useEffect(() => {
        if (scope !== "owner") {
            return;
        }
        const load = async () => {
            try {
                const res = await api.get<{ data: ScheduleException[] }>(
                    "/owner/schedule-exceptions",
                    { params: { from: props.date, to: nextDayOf(props.date) } }
                );
                setExceptions(res.data.data);
            } catch {
                // Failures surface as a toast via the axios error interceptor.
            }
        };
        void load();
    }, [props.date, refreshKey, scope]);

    const reload = async () => {
        setRefreshKey((key) => key + 1);
        await props.onChanged();
    };

    const removeException = async (): Promise<void> => {
        if (!removing) {
            return;
        }
        setRemoveBusy(true);
        try {
            await api.delete(`/owner/schedule-exceptions/${removing.id}`);
            toast.success("Block removed. The time is bookable again.");
            setRemoving(null);
            await reload();
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setRemoveBusy(false);
        }
    };

    const staffName = (staffId: number | null): string => {
        if (staffId === null) {
            return "Whole salon";
        }
        const member = props.staff.find((entry) => entry.id === staffId);
        return member
            ? `${member.first_name} ${member.last_name}`.trim()
            : `Staff #${staffId}`;
    };

    return (
        <Modal title={formatFullDate(props.date)} onClose={props.onClose} wide>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                    Hours, leaves and appointments for this day.
                </p>
                {scope === "owner" && (
                    <button
                        type="button"
                        onClick={() => setBlockOpen(true)}
                        className="min-h-11 rounded-lg bg-primary-dark px-4 text-sm font-medium text-white transition-colors hover:bg-primary-press"
                    >
                        + Block time (closure)
                    </button>
                )}
            </div>

            {props.entries.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No staff scheduled for this day.</p>
            ) : (
                <ul className="mt-4 grid gap-3">
                    {props.entries.map((entry) => {
                        const status = dayStatus(entry.day);
                        const count = entry.day.appointments.length;
                        const isOpen = expanded === entry.staffId;

                        return (
                            <li
                                key={entry.staffId}
                                className="rounded-xl border border-border p-3"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold">
                                        {entry.staffName}
                                    </span>
                                    {entry.position && (
                                        <span className="text-xs text-muted">
                                            {entry.position}
                                        </span>
                                    )}
                                    <span className="rounded-full bg-charcoal/5 px-2 py-0.5 text-[11px] font-medium text-charcoal">
                                        {count} appointment{count === 1 ? "" : "s"}
                                    </span>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[status]}`}
                                    >
                                        {STATUS_TEXT[status]}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setExpanded(isOpen ? null : entry.staffId)
                                        }
                                        aria-expanded={isOpen}
                                        className="ml-auto min-h-11 rounded-lg border border-border px-3 text-xs font-medium transition-colors hover:bg-charcoal/5"
                                    >
                                        {isOpen ? "Hide details" : "View details"}
                                    </button>
                                </div>

                                {!isOpen && (
                                    <p className="mt-1 text-xs opacity-70">
                                        Hours:{" "}
                                        {entry.day.windows.length > 0
                                            ? entry.day.windows
                                                  .map((w) => `${w.startTime}–${w.endTime}`)
                                                  .join(", ")
                                            : "—"}
                                        {entry.day.exceptions.length > 0 &&
                                            ` · ${entry.day.exceptions.length} block${
                                                entry.day.exceptions.length === 1 ? "" : "s"
                                            }`}
                                    </p>
                                )}

                                {isOpen && (
                                    <div className="mt-3 grid gap-3 border-t border-border pt-3">
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wide text-muted">
                                                Working hours
                                            </p>
                                            <p className="mt-1 text-sm">
                                                {entry.day.windows.length > 0
                                                    ? entry.day.windows
                                                          .map(
                                                              (w) =>
                                                                  `${w.startTime}–${w.endTime}`
                                                          )
                                                          .join(", ")
                                                    : "Not a working day"}
                                            </p>
                                        </div>

                                        {entry.day.exceptions.length > 0 && (
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                                                    Blocks
                                                </p>
                                                <ul className="mt-1 grid gap-1">
                                                    {entry.day.exceptions.map(
                                                        (exception, index) => (
                                                            <li
                                                                key={`${exception.type}-${index}`}
                                                                className="text-sm text-warning"
                                                            >
                                                                {exception.type === "closure"
                                                                    ? "Closure"
                                                                    : "Leave"}{" "}
                                                                {exception.startTime}–
                                                                {exception.endTime}
                                                                {exception.reason
                                                                    ? ` · ${exception.reason}`
                                                                    : ""}
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            </div>
                                        )}

                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wide text-muted">
                                                Appointments ({count})
                                            </p>
                                            {count === 0 ? (
                                                <p className="mt-1 text-sm text-muted">
                                                    No appointments.
                                                </p>
                                            ) : (
                                                <ul className="mt-1 grid gap-2">
                                                    {entry.day.appointments.map(
                                                        (appointment) => (
                                                            <li key={appointment.id}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setDetailId(
                                                                            appointment.id
                                                                        )
                                                                    }
                                                                    className="flex w-full gap-2 rounded-lg border border-border p-2 text-left text-sm transition-colors hover:border-primary hover:bg-primary-light/20"
                                                                >
                                                                    <span
                                                                        aria-hidden
                                                                        className="w-1 shrink-0 self-stretch rounded-full bg-primary/70"
                                                                    />
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-medium">
                                                                                {
                                                                                    appointment.startTime
                                                                                }
                                                                                –
                                                                                {
                                                                                    appointment.endTime
                                                                                }
                                                                            </span>
                                                                            <StatusBadge
                                                                                status={
                                                                                    appointment.status
                                                                                }
                                                                            />
                                                                        </div>
                                                                        <p className="truncate text-xs text-charcoal">
                                                                            {
                                                                                appointment.customerName
                                                                            }{" "}
                                                                            ·{" "}
                                                                            {
                                                                                appointment.serviceName
                                                                            }{" "}
                                                                            ·{" "}
                                                                            {
                                                                                appointment.reference
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </button>
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {scope === "owner" && (
            <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Blocks on this day
                </p>
                {exceptions.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">No blocks.</p>
                ) : (
                    <ul className="mt-2 grid gap-2">
                        {exceptions.map((exception) => (
                            <li
                                key={exception.id}
                                className="flex items-start gap-2 rounded-lg bg-warning-bg p-2 text-sm text-warning"
                            >
                                <div className="min-w-0 flex-1">
                                    <span className="font-medium">
                                        {exception.type === "closure" ? "Closure" : "Leave"}
                                    </span>{" "}
                                    · {staffName(exception.staff_id)} ·{" "}
                                    {clockOf(exception.start_at)}–{clockOf(exception.end_at)}
                                    {exception.reason ? ` · ${exception.reason}` : ""}
                                </div>
                                <button
                                    type="button"
                                    aria-label="Remove block"
                                    onClick={() => setRemoving(exception)}
                                    className="grid h-8 w-8 shrink-0 place-items-center rounded transition-colors hover:bg-warning-line"
                                >
                                    <span aria-hidden>✕</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            )}

            {blockOpen && (
                <BlockTimeModal
                    date={props.date}
                    staff={props.staff}
                    onClose={() => setBlockOpen(false)}
                    onChanged={reload}
                    onCreated={() => {
                        toast.success("Time blocked.");
                        void reload();
                    }}
                />
            )}

            {detailId !== null && (
                <AppointmentDrawer
                    appointmentId={detailId}
                    staff={props.staff}
                    scope={scope}
                    onClose={() => setDetailId(null)}
                    onChanged={reload}
                />
            )}

            {removing && (
                <ConfirmDialog
                    title="Remove this block?"
                    message={
                        <p>
                            This removes the block on {props.date} (
                            {clockOf(removing.start_at)}–{clockOf(removing.end_at)}). The time
                            becomes bookable again.
                        </p>
                    }
                    confirmLabel="Remove block"
                    busy={removeBusy}
                    busyLabel="Removing…"
                    onConfirm={() => void removeException()}
                    onCancel={() => setRemoving(null)}
                />
            )}
        </Modal>
    );
}
