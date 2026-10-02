import type { AppointmentStatus } from "../../types";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
    pending: "bg-warning-bg text-warning",
    confirmed: "bg-info-bg text-info",
    completed: "bg-success-bg text-success",
    cancelled: "bg-danger-bg text-danger",
    no_show: "bg-charcoal/10 text-charcoal",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No-show",
};

export function StatusBadge(props: { status: AppointmentStatus }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[props.status]}`}
        >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {STATUS_LABELS[props.status]}
        </span>
    );
}
