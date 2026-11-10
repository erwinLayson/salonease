import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { toast } from "../../lib/toast";

// UI components
import { Card } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { LeaveStatusBadge } from "../ui/LeaveStatusBadge";
import { Select } from "../ui/Select";
import { LeaveRequestReviewModal } from "./LeaveRequestReviewModal";

// Types
import type { LeaveRequest, OwnerStaff } from "../../types";
import { formatDateTime } from "../../lib/utils";

/** `2026-10-03` -> `Oct 3, 2026`. */
const formatDay = (key: string): string =>
    new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

export interface LeaveRequestsSectionProps {
    staffList?: OwnerStaff[];
    onPendingCountChange?: (count: number) => void;
}

/**
 * Staff leave requests management interface with review, approval, and cancellation workflows.
 * Pending requests open the review modal (conflict check + approve/reject);
 * approved requests can be revoked, which restores appointment availability.
 */
export function LeaveRequestsSection(props: LeaveRequestsSectionProps) {
    const { staffList, onPendingCountChange } = props;
    const [selectedStatus, setSelectedStatus] = useState<string>("pending");
    const [selectedStaffId, setSelectedStaffId] = useState<string>("");
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [localKey, setLocalKey] = useState(0);
    const [reviewFor, setReviewFor] = useState<LeaveRequest | null>(null);
    const [removeFor, setRemoveFor] = useState<LeaveRequest | null>(null);
    const [busy, setBusy] = useState(false);

    const reload = useCallback(() => setLocalKey((key) => key + 1), []);

    const onPendingCountChangeRef = useRef(onPendingCountChange);
    useEffect(() => {
        onPendingCountChangeRef.current = onPendingCountChange;
    }, [onPendingCountChange]);

    useEffect(() => {
        let stale = false;
        const load = async () => {
            setLoading(true);
            try {
                // Fetch all requests to compute tab counts and enable instant tab switching
                const res = await api.get<{ data: LeaveRequest[] }>(
                    "/owner/leave-requests",
                    { params: selectedStaffId ? { staffId: selectedStaffId } : {} }
                );
                if (!stale) {
                    setRequests(res.data.data);
                    const pending = res.data.data.filter((r) => r.status === "pending").length;
                    onPendingCountChangeRef.current?.(pending);
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
    }, [selectedStaffId, localKey]);

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

    const pendingCount = useMemo(
        () => requests.filter((r) => r.status === "pending").length,
        [requests]
    );
    const approvedCount = useMemo(
        () => requests.filter((r) => r.status === "approved").length,
        [requests]
    );
    const rejectedCount = useMemo(
        () => requests.filter((r) => r.status === "rejected").length,
        [requests]
    );

    // Filter by selected status tab
    const filteredRequests = useMemo(() => {
        let list = requests;
        if (selectedStatus) {
            list = list.filter((r) => r.status === selectedStatus);
        }
        // Prioritize pending requests, then sort by requested start date descending
        return [...list].sort((a, b) => {
            if (a.status === "pending" && b.status !== "pending") return -1;
            if (a.status !== "pending" && b.status === "pending") return 1;
            return b.startDate.localeCompare(a.startDate);
        });
    }, [requests, selectedStatus]);

    return (
        <Card
            title={`Leave requests (${requests.length})`}
            actions={
                <button
                    type="button"
                    onClick={() => reload()}
                    disabled={loading}
                    title="Reload leave requests"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-charcoal/5 transition-colors disabled:opacity-50"
                >
                    <svg
                        className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    Refresh
                </button>
            }
        >
            <p className="max-w-2xl text-xs text-muted">
                Staff submit time-off requests from their portal. Only approved leave
                blocks appointment availability. Reviewing a request checks for conflicting bookings.
            </p>

            {/* Pending alert banner */}
            {pendingCount > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-warning-line bg-warning-bg/80 px-4 py-2.5 text-sm text-warning">
                    <div className="flex items-center gap-2">
                        <span aria-hidden="true" className="font-bold">⚠️</span>
                        <span>
                            <strong>{pendingCount}</strong> request{pendingCount === 1 ? "" : "s"} waiting for review
                        </span>
                    </div>
                    {selectedStatus !== "pending" && (
                        <button
                            type="button"
                            onClick={() => setSelectedStatus("pending")}
                            className="text-xs font-semibold underline hover:text-amber-900"
                        >
                            View pending
                        </button>
                    )}
                </div>
            )}

            {/* Status Pills and Staff Filter Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
                <div
                    className="inline-flex flex-wrap rounded-xl bg-charcoal/5 p-1 border border-border/40"
                    role="tablist"
                    aria-label="Filter by leave status"
                >
                    <button
                        type="button"
                        onClick={() => setSelectedStatus("pending")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                            selectedStatus === "pending"
                                ? "bg-primary-dark text-white shadow-xs"
                                : "text-charcoal hover:bg-charcoal/5"
                        }`}
                    >
                        Pending
                        {pendingCount > 0 && (
                            <span
                                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                    selectedStatus === "pending"
                                        ? "bg-white text-primary-dark"
                                        : "bg-amber-100 text-amber-800"
                                }`}
                            >
                                {pendingCount}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedStatus("approved")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                            selectedStatus === "approved"
                                ? "bg-primary-dark text-white shadow-xs"
                                : "text-charcoal hover:bg-charcoal/5"
                        }`}
                    >
                        Approved ({approvedCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedStatus("rejected")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                            selectedStatus === "rejected"
                                ? "bg-primary-dark text-white shadow-xs"
                                : "text-charcoal hover:bg-charcoal/5"
                        }`}
                    >
                        Rejected ({rejectedCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedStatus("")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                            selectedStatus === ""
                                ? "bg-primary-dark text-white shadow-xs"
                                : "text-charcoal hover:bg-charcoal/5"
                        }`}
                    >
                        All requests ({requests.length})
                    </button>
                </div>

                {staffList && staffList.length > 0 && (
                    <div className="w-full sm:w-48">
                        <Select
                            label=""
                            value={selectedStaffId}
                            onChange={setSelectedStaffId}
                            options={[
                                { value: "", label: "All staff members" },
                                ...staffList.map((m) => ({
                                    value: String(m.id),
                                    label: `${m.first_name} ${m.last_name}`.trim(),
                                })),
                            ]}
                        />
                    </div>
                )}
            </div>

            {loading ? (
                <p className="py-6 text-center text-sm text-muted">Loading…</p>
            ) : filteredRequests.length === 0 ? (
                <div className="py-8 text-center">
                    <p className="text-sm font-medium">
                        {selectedStatus === "pending"
                            ? "No pending leave requests"
                            : selectedStatus === "approved"
                              ? "No approved leave requests"
                              : selectedStatus === "rejected"
                                ? "No rejected leave requests"
                                : "No leave requests found"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                        {selectedStatus === "pending"
                            ? "All employee leave requests have been reviewed."
                            : "Choose another status tab to see more requests."}
                    </p>
                </div>
            ) : (
                <ul className="mt-4 grid gap-3">
                    {filteredRequests.map((request) => (
                        <li
                            key={request.id}
                            className={`rounded-xl border p-4 transition-colors ${
                                request.status === "pending"
                                    ? "border-amber-300/80 bg-amber-50/15 hover:border-amber-400"
                                    : request.status === "approved"
                                      ? "border-emerald-200 bg-emerald-50/10 hover:border-emerald-300"
                                      : "border-border hover:border-primary/50"
                            }`}
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-charcoal">
                                    {request.staffName}
                                </span>
                                <LeaveStatusBadge status={request.status} />
                                <span className="ml-auto rounded-lg bg-primary-light/40 px-2.5 py-1 text-xs font-medium text-charcoal">
                                    {formatDay(request.startDate)} –{" "}
                                    {formatDay(request.endDate)} · {request.days} day
                                    {request.days === 1 ? "" : "s"}
                                </span>
                            </div>

                            <p className="mt-2 text-xs text-muted">
                                Requested {formatDateTime(request.requestedAt)}
                                {request.reason ? ` · Reason: "${request.reason}"` : ""}
                            </p>

                            {request.decisionNote && (
                                <p
                                    className={`mt-1.5 text-xs ${
                                        request.status === "rejected"
                                            ? "text-danger font-medium"
                                            : "text-charcoal"
                                    }`}
                                >
                                    {request.status === "rejected" ? "Rejection note" : "Decision note"}: {request.decisionNote}
                                </p>
                            )}
                            {request.status === "approved" && request.decidedAt && (
                                <p className="mt-1.5 text-xs text-success">
                                    ✓ Approved on {formatDateTime(request.decidedAt)} — calendar dates are blocked.
                                </p>
                            )}

                            {request.status === "pending" && (
                                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setReviewFor(request)}
                                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary-dark px-4 text-xs font-medium text-white shadow-xs transition-colors hover:bg-primary-press"
                                    >
                                        Review &amp; decide
                                    </button>
                                    <span className="text-xs text-muted">
                                        Checks for appointment conflicts before approval
                                    </span>
                                </div>
                            )}

                            {request.status === "approved" && (
                                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setRemoveFor(request)}
                                        className="inline-flex min-h-10 items-center rounded-lg border border-danger-line px-3.5 text-xs font-medium text-danger transition-colors hover:bg-danger-bg"
                                    >
                                        Remove leave
                                    </button>
                                    <span className="text-xs text-muted">
                                        Restores employee booking availability for these dates
                                    </span>
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
                                Remove the approved leave for{" "}
                                <strong>{removeFor.staffName}</strong> for{" "}
                                <strong>
                                    {formatDay(removeFor.startDate)} –{" "}
                                    {formatDay(removeFor.endDate)}
                                </strong>
                                ?
                            </p>
                            <p className="mt-2 text-xs text-muted">
                                The schedule exception blocking these dates will be removed, making them bookable again for client appointments. The request record will be marked cancelled.
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
        </Card>
    );
}
