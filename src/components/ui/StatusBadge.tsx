import type { AppointmentStatus } from "../../types";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
    pending: "border border-warning-line bg-warning-bg text-warning",
    confirmed: "border border-info-line bg-info-bg text-info",
    completed: "border border-success-line bg-success-bg text-success",
    cancelled: "border border-danger-line bg-danger-bg text-danger",
    no_show: "border border-border-strong bg-charcoal/5 text-muted",
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
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[props.status]}`}
        >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {STATUS_LABELS[props.status]}
        </span>
    );
}
