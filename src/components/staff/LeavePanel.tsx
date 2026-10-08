import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

// UI components
import { LeaveStatusBadge } from "../ui/LeaveStatusBadge";

// Types
import type { LeaveRequest } from "../../types";
import { formatDateTime } from "../../lib/utils";

/** `2026-10-03` -> `Oct 3, 2026`. */
const formatDay = (key: string): string =>
    new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

/** `2026-10-05` -> `Monday, October 5`. */
const formatDayHeader = (key: string): string => {
    const [year = "0", month = "1", day = "1"] = key.split("-");
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
        undefined,
        { weekday: "long", month: "long", day: "numeric" }
    );
};

/**
 * The calendar's right-hand "Leave Schedule" panel for the staff schedule:
 * the selected date's approved leave (or a clear empty state) and a
 * prominent request action. Pending requests are mentioned as context but
 * never colour the calendar — only the owner's approval creates the
 * blocking leave. The member's request history lives in the full-width
 * section below the calendar.
 */
export function LeavePanel(props: {
    /** The calendar's selected date (`YYYY-MM-DD`). */
    date: string;
    /** Bumped by the parent after a new request is submitted. */
    refreshKey: number;
    /** Opens the request modal. */
    onRequest: () => void;
}) {
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let stale = false;
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get<{ data: LeaveRequest[] }>("/staff/leave-requests");
                if (!stale) {
                    setRequests(res.data.data);
                }
            } catch {
                // Failures surface as a toast via the axios error interceptor.
            } finally {
                if (!stale) {
                    setLoading(false);
                }
            }
        };
        void load();
        return () => {
            stale = true;
        };
    }, [props.refreshKey]);

    // The selected date's approved leave, plus any pending request covering
    // it (mentioned only as context — pending never blocks the schedule).
    const { approved, pending } = useMemo(() => {
        const covers = (request: LeaveRequest): boolean =>
            request.startDate <= props.date && props.date <= request.endDate;
        return {
            approved: requests.filter(
                (request) => request.status === "approved" && covers(request)
            ),
            pending: requests.filter(
                (request) => request.status === "pending" && covers(request)
            ),
        };
    }, [requests, props.date]);

    return (
        <section
            className="flex flex-col rounded-xl border border-border bg-surface p-3 sm:p-4"
            aria-live="polite"
        >
            <div className="mb-3">
                <h3 className="text-base font-semibold tracking-tight">
                    {formatDayHeader(props.date)}
                </h3>
                <p className="text-xs text-muted">Leave Schedule</p>
            </div>

            {loading ? (
                <p className="py-6 text-center text-sm text-muted">Loading…</p>
            ) : approved.length > 0 ? (
                <div className="grid gap-3">
                    {approved.map((request) => (
                        <div
                            key={request.id}
                            className="rounded-xl border border-success-line bg-success-bg p-4"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-success">
                                    Leave Approved
                                </p>
                                <LeaveStatusBadge status={request.status} />
                            </div>
                            <dl className="mt-2 grid gap-2 text-sm">
                                <div>
                                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                                        Dates
                                    </dt>
                                    <dd className="mt-0.5">
                                        {formatDay(request.startDate)} –{" "}
                                        {formatDay(request.endDate)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                                        Days
                                    </dt>
                                    <dd className="mt-0.5">
                                        {request.days} day{request.days === 1 ? "" : "s"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                                        Reason
                                    </dt>
                                    <dd className="mt-0.5">
                                        {request.reason || "No reason given"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                                        Approved
                                    </dt>
                                    <dd className="mt-0.5">
                                        {request.decidedAt
                                            ? formatDateTime(request.decidedAt)
                                            : "—"}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-6 text-center">
                    <p className="text-sm font-medium">No leave scheduled</p>
                    <p className="mt-1 text-sm text-muted">
                        You don't have any approved leave for this date.
                    </p>
                    {pending.length > 0 && (
                        <p className="mt-2 text-xs text-warning">
                            {pending.length} pending request
                            {pending.length === 1 ? "" : "s"} covers this date — your
                            schedule is unchanged until the owner approves it.
                        </p>
                    )}
                </div>
            )}

            {/* `mt-auto` pins the action to the bottom of the panel, matching
                the reference layout where it sits under the leave info. */}
            <div className="mt-auto pt-4">
                <button
                    type="button"
                    onClick={props.onRequest}
                    className="flex min-h-11 w-full items-center justify-center rounded-lg bg-primary-dark px-4 text-sm font-medium text-white transition-colors hover:bg-primary-press"
                >
                    Request leave
                </button>
            </div>
        </section>
    );
}
