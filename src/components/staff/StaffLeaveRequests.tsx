import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { toast } from "../../lib/toast";

// UI components
import { Card } from "../ui/Card";
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

/**
 * Full-width section beneath the calendar: the signed-in staff member's own
 * leave-request history with a Withdraw action for pending requests. Pending
 * requests keep the schedule unchanged until the owner approves them.
 */
export function StaffLeaveRequests(props: {
    /** Bumped by the parent after a new request is submitted. */
    refreshKey: number;
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
        <Card title={`Leave requests (${requests.length})`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="max-w-xl text-xs text-muted">
                    Pending requests keep your schedule unchanged; approved leave
                    blocks bookings for those dates.
                </p>
            </div>

            {loading ? (
                <p className="py-6 text-center text-sm text-muted">Loading…</p>
            ) : requests.length === 0 ? (
                <div className="py-8 text-center">
                    <p className="text-sm font-medium">No leave requests yet.</p>
                    <p className="mt-1 text-xs text-muted">
                        Ask for time off and the owner will review it here.
                    </p>
                </div>
            ) : (
                // The list scrolls within its own area so a long history
                // does not push the calendar down the page.
                <ul className="mt-4 grid max-h-[24rem] gap-3 overflow-y-auto">
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
        </Card>
    );
}
