import { useEffect, useState } from "react";
import { api } from "../../lib/api";

import type { AvailabilityResponse } from "../../types";

/** Availability slots for a service/staff/date, used by reschedule and new bookings. */
export function SlotGrid(props: {
    serviceId: number;
    staffId: number | null;
    date: string;
    selected: string | null;
    onSelect: (slot: string) => void;
}) {
    const [slots, setSlots] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get<{ data: AvailabilityResponse }>(
                    "/owner/availability"
                , {
                    params: {
                        serviceId: props.serviceId,
                        date: props.date,
                        ...(props.staffId ? { staffId: props.staffId } : {}),
                    },
                });
                setSlots(
                    [
                        ...new Set(res.data.data.staff.flatMap((entry) => entry.slots)),
                    ].sort()
                );
            } catch {
                setSlots([]);
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [props.serviceId, props.staffId, props.date]);

    if (loading) {
        return <p className="text-sm text-muted">Loading slots…</p>;
    }
    if (slots.length === 0) {
        return <p className="text-sm text-muted">No available slots on this date.</p>;
    }

    return (
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
    );
}
