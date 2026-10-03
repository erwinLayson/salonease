import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { toast } from "../../lib/toast";

// UI components
import { ConfirmDialog } from "../ui/ConfirmDialog";
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
 * The calendar's right-hand panel for the staff schedule: the selected
 * date's approved leave (or a clear empty state), a prominent request
 * action, and the staff member's own request history below. Pending
 * requests are listed but never colour the calendar — only the owner's
 * approval creates the blocking leave.
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
    const [localKey, setLocalKey] = useState(0);
    const [withdrawFor, setWithdrawFor] = useState<LeaveRequest | null>(null);
    const [busy, setBusy] = useState(false);

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
    }, [props.refreshKey, localKey]);

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

    const withdraw = async (): Promise<void> => {
        if (!withdrawFor) {
            return;
        }
        setBusy(true);
        try {
            await api.patch(
                `/staff/leave-requests/${withdrawFor.id}/cancel`,
                {},
                { skipErrorToast: true }
            );
            toast.success("Request withdrawn.");
            setWithdrawFor(null);
            setLocalKey((key) => key + 1);
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <section
            className="rounded-xl border border-border bg-surface p-3 sm:p-4"
            aria-live="polite"
        >
            <div className="mb-3">
                <h3 className="text-base font-semibold tracking-tight">
                    {formatDayHeader(props.date)}
                </h3>
                <p className="text-xs text-muted">Leave</p>
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

            <button
                type="button"
                onClick={props.onRequest}
                className="mt-4 flex min-h-11 w-full items-center justify-center rounded-lg bg-primary-dark px-4 text-sm font-medium text-white transition-colors hover:bg-primary-press"
            >
                Request leave
            </button>

            <div className="mt-4 border-t border-border pt-3">
                <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold">Leave requests</h4>
                    <span className="text-xs text-muted">{requests.length} total</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                    Pending requests keep your schedule unchanged; approved leave
                    blocks bookings for those dates.
                </p>

                {loading ? (
                    <p className="py-6 text-center text-sm text-muted">Loading…</p>
                ) : requests.length === 0 ? (
                    <div className="py-6 text-center">
                        <p className="text-sm font-medium">No leave requests yet.</p>
                        <p className="mt-1 text-xs text-muted">
                            Ask for time off and the owner will review it here.
                        </p>
                    </div>
                ) : (
                    // The list scrolls within its own area so a long history
                    // does not push the calendar down the page.
                    <ul className="mt-3 grid max-h-[24rem] gap-3 overflow-y-auto">
                        {requests.map((request) => (
                            <li
                                key={request.id}
                                className="rounded-xl border border-border p-4"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold">
                                        {formatDay(request.startDate)} –{" "}
                                        {formatDay(request.endDate)}
                                    </span>
                                    <span className="text-xs text-muted">
                                        {request.days} day{request.days === 1 ? "" : "s"}
                                    </span>
                                    <LeaveStatusBadge status={request.status} />
                                    {request.status === "pending" && (
                                        <button
                                            type="button"
                                            onClick={() => setWithdrawFor(request)}
                                            className="ml-auto min-h-11 rounded-lg border border-border px-3 text-xs font-medium transition-colors hover:bg-charcoal/5"
                                        >
                                            Withdraw
                                        </button>
                                    )}
                                </div>

                                {request.reason && (
                                    <p className="mt-1 text-xs text-charcoal">
                                        {request.reason}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-muted">
                                    Requested {formatDateTime(request.requestedAt)}
                                </p>

                                {request.status === "rejected" && request.decisionNote && (
                                    <p className="mt-1 text-xs text-danger">
                                        Rejected — {request.decisionNote}
                                    </p>
                                )}
                                {request.status === "rejected" && !request.decisionNote && (
                                    <p className="mt-1 text-xs text-danger">Rejected</p>
                                )}
                                {request.status === "approved" && (
                                    <p className="mt-1 text-xs text-success">
                                        Approved
                                        {request.decidedAt
                                            ? ` — ${formatDateTime(request.decidedAt)}`
                                            : ""}
                                    </p>
                                )}
                                {request.status === "cancelled" && request.decidedAt && (
                                    <p className="mt-1 text-xs text-muted">
                                        Withdrawn {formatDateTime(request.decidedAt)}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {withdrawFor && (
                <ConfirmDialog
                    title="Withdraw this request?"
                    message={
                        <>
                            <p>
                                This withdraws your leave request for{" "}
                                <strong>
                                    {formatDay(withdrawFor.startDate)} –{" "}
                                    {formatDay(withdrawFor.endDate)}
                                </strong>
                                . The owner will no longer see it as pending.
                            </p>
                            <p className="mt-2 text-xs text-muted">
                                You can submit a new request afterwards.
                            </p>
                        </>
                    }
                    confirmLabel="Withdraw request"
                    busy={busy}
                    busyLabel="Withdrawing…"
                    onConfirm={() => void withdraw()}
                    onCancel={() => setWithdrawFor(null)}
                />
            )}
        </section>
    );
}
