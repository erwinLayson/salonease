import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { toast } from "../../lib/toast";

// UI components
import { Card } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { LeaveStatusBadge } from "../ui/LeaveStatusBadge";
import { Select } from "../ui/Select";
import { LeaveRequestReviewModal } from "./LeaveRequestReviewModal";

// Types
import type { LeaveRequest } from "../../types";
import { formatDateTime } from "../../lib/utils";

const STATUS_OPTIONS = [
    { value: "", label: "All requests" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "cancelled", label: "Cancelled" },
];

/** `2026-10-03` -> `Oct 3, 2026`. */
const formatDay = (key: string): string =>
    new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

/**
 * Owner dashboard section: staff leave requests with the decision actions.
 * Pending requests open the review modal (conflict check + approve/reject);
 * approved ones can be undone, which unblocks the dates again.
 */
export function LeaveRequestsSection() {
    const [status, setStatus] = useState("");
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [localKey, setLocalKey] = useState(0);
    const [reviewFor, setReviewFor] = useState<LeaveRequest | null>(null);
    const [removeFor, setRemoveFor] = useState<LeaveRequest | null>(null);
    const [busy, setBusy] = useState(false);

    const reload = useCallback(() => setLocalKey((key) => key + 1), []);

    useEffect(() => {
        let stale = false;
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get<{ data: LeaveRequest[] }>(
                    "/owner/leave-requests",
                    { params: status ? { status } : {} }
                );
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
    }, [status, localKey]);

    const removeLeave = async (): Promise<void> => {
        if (!removeFor) {
            return;
        }
        setBusy(true);
        try {
            await api.post(`/owner/leave-requests/${removeFor.id}/cancel`, {});
            toast.success("Leave removed — the dates are bookable again.");
            setRemoveFor(null);
            reload();
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const pendingCount = requests.filter((request) => request.status === "pending").length;

    return (
        <Card title={`Leave requests (${requests.length})`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
                <p className="max-w-xl text-xs text-muted">
                    Staff submit these from their Schedule page. Only approved leave
                    blocks availability; you can review affected appointments before
                    approving.
                </p>
                <div className="w-full sm:w-56">
                    <Select
                        label="Show"
                        value={status}
                        onChange={setStatus}
                        options={STATUS_OPTIONS}
                    />
                </div>
            </div>

            {loading ? (
                <p className="py-6 text-center text-sm text-muted">Loading…</p>
            ) : requests.length === 0 ? (
                <div className="py-8 text-center">
                    <p className="text-sm font-medium">
                        {status ? "No requests with this status" : "No leave requests yet"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                        {status
                            ? "Choose another status to see more."
                            : "Requests from staff appear here for review."}
                    </p>
                </div>
            ) : (
                <ul className="mt-4 grid gap-3">
                    {requests.map((request) => (
                        <li
                            key={request.id}
                            className="rounded-xl border border-border p-4 transition-colors hover:border-primary/70"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold">
                                    {request.staffName}
                                </span>
                                <LeaveStatusBadge status={request.status} />
                                <span className="ml-auto rounded-lg bg-primary-light px-2.5 py-1 text-xs font-medium text-charcoal">
                                    {formatDay(request.startDate)} –{" "}
                                    {formatDay(request.endDate)} · {request.days} day
                                    {request.days === 1 ? "" : "s"}
                                </span>
                            </div>

                            <p className="mt-2 text-xs text-muted">
                                Requested {formatDateTime(request.requestedAt)}
                                {request.reason ? ` · ${request.reason}` : ""}
                            </p>

                            {request.decisionNote && (
                                <p
                                    className={`mt-1 text-xs ${
                                        request.status === "rejected"
                                            ? "text-danger"
                                            : "text-charcoal"
                                    }`}
                                >
                                    {request.status === "rejected" ? "Rejected" : "Note"} —{" "}
                                    {request.decisionNote}
                                </p>
                            )}
                            {request.status === "approved" && request.decidedAt && (
                                <p className="mt-1 text-xs text-success">
                                    Approved {formatDateTime(request.decidedAt)} — dates
                                    blocked.
                                </p>
                            )}

                            {request.status === "pending" && (
                                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setReviewFor(request)}
                                        className="min-h-11 rounded-lg bg-primary-dark px-4 text-xs font-medium text-white transition-colors hover:bg-primary-press"
                                    >
                                        Review &amp; decide
                                    </button>
                                </div>
                            )}

                            {request.status === "approved" && (
                                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setRemoveFor(request)}
                                        className="min-h-11 rounded-lg border border-danger-line px-4 text-xs font-medium text-danger transition-colors hover:bg-danger-bg"
                                    >
                                        Remove leave
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {reviewFor && (
                <LeaveRequestReviewModal
                    request={reviewFor}
                    onClose={() => setReviewFor(null)}
                    onDecided={reload}
                />
            )}

            {removeFor && (
                <ConfirmDialog
                    title="Remove this approved leave?"
                    message={
                        <>
                            <p>
                                This removes the approved leave for{" "}
                                <strong>{removeFor.staffName}</strong> on{" "}
                                <strong>
                                    {formatDay(removeFor.startDate)} –{" "}
                                    {formatDay(removeFor.endDate)}
                                </strong>
                                . Those dates become bookable again.
                            </p>
                            <p className="mt-2 text-xs text-muted">
                                The request stays on record as cancelled.
                            </p>
                        </>
                    }
                    confirmLabel="Remove leave"
                    busy={busy}
                    busyLabel="Removing…"
                    onConfirm={() => void removeLeave()}
                    onCancel={() => setRemoveFor(null)}
                />
            )}

            {pendingCount > 0 && !loading && (
                <p className="mt-3 text-xs text-warning">
                    {pendingCount} request{pendingCount === 1 ? "" : "s"} waiting for a
                    decision.
                </p>
            )}
        </Card>
    );
}
