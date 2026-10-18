import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

import type {
    AppointmentDetail,
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
    /** Appointment to exclude from the booked (red) set, e.g. when rescheduling. */
    excludeAppointmentId?: number | null;
}) {
    const [data, setData] = useState<AvailabilityResponse | null>(null);
    const [booked, setBooked] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [availRes, apptRes] = await Promise.all([
                    api.get<{ data: AvailabilityResponse }>(
                        "/owner/availability",
                        {
                            params: {
                                serviceId: props.serviceId,
                                date: props.date,
                                ...(props.staffId ? { staffId: props.staffId } : {}),
                            },
                        }
                    ),
                    props.staffId
                        ? api.get<{ data: AppointmentDetail[] }>("/owner/appointments", {
                              params: { date: props.date, staffId: props.staffId },
                          })
                        : Promise.resolve({ data: { data: [] as AppointmentDetail[] } }),
                ]);
                setData(availRes.data.data);
                const activeStatuses = new Set(["pending", "confirmed"]);
                const bookedSlots = (apptRes.data.data ?? [])
                    .filter(
                        (appointment) =>
                            activeStatuses.has(appointment.status) &&
                            appointment.id !== (props.excludeAppointmentId ?? null)
                    )
                    .map((appointment) => appointment.startAt.slice(11, 16));
                setBooked([...new Set(bookedSlots)].sort());
            } catch {
                setData(null);
                setBooked([]);
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [props.serviceId, props.staffId, props.date, props.excludeAppointmentId]);

    const entry = data?.staff[0] ?? null;
    const availableSlots = useMemo(
        () =>
            [...new Set((data?.staff ?? []).flatMap((item) => item.slots))].sort(),
        [data]
    );
    const slots = useMemo(
        () => [...new Set([...availableSlots, ...booked])].sort(),
        [availableSlots, booked]
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
                    {slots.map((slot) => {
                        const isBooked = booked.includes(slot) && !availableSlots.includes(slot);
                        return (
                            <button
                                key={slot}
                                type="button"
                                disabled={isBooked}
                                onClick={() => {
                                    if (isBooked) {
                                        return;
                                    }
                                    props.onSelect(slot);
                                }}
                                aria-pressed={props.selected === slot}
                                className={`min-h-11 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                    isBooked
                                        ? "cursor-not-allowed border-danger-line bg-danger-bg text-danger"
                                        : props.selected === slot
                                          ? "border-primary-dark bg-primary-dark font-medium text-white shadow-sm"
                                          : "border-border bg-surface hover:border-primary hover:bg-primary-light/30"
                                }`}
                            >
                                {slot}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
