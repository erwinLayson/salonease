import type { LeaveRequestStatus } from "../../types";

const STATUS_STYLES: Record<LeaveRequestStatus, string> = {
    pending: "bg-warning-bg text-warning",
    approved: "bg-success-bg text-success",
    rejected: "bg-danger-bg text-danger",
    cancelled: "bg-charcoal/10 text-charcoal",
};

const STATUS_LABELS: Record<LeaveRequestStatus, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
};

export function LeaveStatusBadge(props: { status: LeaveRequestStatus }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[props.status]}`}
        >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {STATUS_LABELS[props.status]}
        </span>
    );
}
