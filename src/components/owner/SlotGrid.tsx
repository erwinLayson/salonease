import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

import type {
    AvailabilityResponse,
    SlotAvailabilityStatus,
    StaffSlots,
} from "../../types";

/** Visual treatment for each day-level availability status. */
const STATUS_META: Record<
    SlotAvailabilityStatus,
    { label: string; className: string; defaultReason: string }
> = {
    available: {
        label: "Available",
        className: "border-success-line bg-success-bg text-success",
        defaultReason: "This staff member is free on this date.",
    },
    busy: {
        label: "Busy",
        className: "border-warning-line bg-warning-bg text-warning",
        defaultReason: "This staff member is fully booked on this date.",
    },
    unavailable: {
        label: "Unavailable",
        className: "border-danger-line bg-danger-bg text-danger",
        defaultReason: "This staff member is not available on this date.",
    },
};

function AvailabilityBanner(props: { entry: StaffSlots }) {
    const meta = STATUS_META[props.entry.status];
    const reason = props.entry.reason ?? meta.defaultReason;

    return (
        <div
            role="status"
            className={`mb-3 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${meta.className}`}
        >
            <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-current" />
            <div className="min-w-0">
                <p className="font-semibold">
                    {props.entry.staffName} — {meta.label}
                </p>
                <p className="mt-0.5">{reason}</p>
            </div>
        </div>
    );
}

/**
 * Availability slots for a service/staff/date, used by reschedule and new
 * bookings.
 *
 * The slots and the day-level status both come from the backend (the database
 * is the source of truth), so busy or unavailable time is never selectable.
 */
export function SlotGrid(props: {
    serviceId: number;
    staffId: number | null;
    date: string;
    selected: string | null;
    onSelect: (slot: string) => void;
    /** Show the day-level Available/Busy/Unavailable banner (walk-in form). */
    showStatus?: boolean;
    /** Notifies the parent of the selected staff member's day status. */
    onStatusChange?: (
        status: SlotAvailabilityStatus | null,
        reason: string | null
    ) => void;
}) {
    const [data, setData] = useState<AvailabilityResponse | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get<{ data: AvailabilityResponse }>(
                    "/owner/availability",
                    {
                        params: {
                            serviceId: props.serviceId,
                            date: props.date,
                            ...(props.staffId ? { staffId: props.staffId } : {}),
                        },
                    }
                );
                setData(res.data.data);
            } catch {
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [props.serviceId, props.staffId, props.date]);

    const entry = data?.staff[0] ?? null;
    const slots = useMemo(
        () =>
            [...new Set((data?.staff ?? []).flatMap((item) => item.slots))].sort(),
        [data]
    );

    const { onStatusChange } = props;
    useEffect(() => {
        onStatusChange?.(entry?.status ?? null, entry?.reason ?? null);
    }, [entry, onStatusChange]);

    if (loading) {
        return <p className="text-sm text-muted">Checking availability…</p>;
    }

    return (
        <div>
            {props.showStatus && entry && <AvailabilityBanner entry={entry} />}

            {slots.length === 0 ? (
                <p className="text-sm text-muted">
                    {props.showStatus && entry
                        ? "No bookable slots on this date."
                        : "No available slots on this date."}
                </p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                        <button
                            key={slot}
                            type="button"
                            onClick={() => props.onSelect(slot)}
                            aria-pressed={props.selected === slot}
                            className={`min-h-11 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                props.selected === slot
                                    ? "border-primary-dark bg-primary-dark font-medium text-white shadow-sm"
                                    : "border-border bg-surface hover:border-primary hover:bg-primary-light/30"
                            }`}
                        >
                            {slot}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
