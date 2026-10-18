import { useEffect, useState } from "react";

import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/utils";

import { Card } from "../../components/ui/Card";

import type { StaffEvent } from "../../types";

const ROLE_LABELS: Record<string, string> = {
    lead: "Lead stylist",
    assistant: "Assistant",
    makeup: "Make-up",
    hair: "Hair",
    coordinator: "Coordinator",
};

export default function MyEventsPage() {
    const [events, setEvents] = useState<StaffEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void api
            .get<{ data: StaffEvent[] }>("/staff/events")
            .then((res) => setEvents(res.data.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="grid gap-6">
            <header>
                <h1 className="text-xl font-semibold tracking-tight">My events</h1>
                <p className="mt-1 text-sm text-muted">
                    On-location assignments, call times and venue details for the next 30
                    days.
                </p>
            </header>

            {loading ? (
                <Card>
                    <p className="py-8 text-center text-sm text-muted">Loading events…</p>
                </Card>
            ) : events.length === 0 ? (
                <Card>
                    <p className="py-10 text-center text-sm text-muted">
                        No event assignments in the next 30 days.
                    </p>
                </Card>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {events.map((event) => (
                        <Card key={`${event.eventId}-${event.callTime}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-mono text-muted">
                                        {event.reference}
                                    </p>
                                    <h2 className="mt-1 text-base font-semibold">
                                        {event.title}
                                    </h2>
                                    <p className="mt-0.5 text-sm text-muted">
                                        {event.venueName ?? "Venue to be confirmed"}
                                    </p>
                                </div>
                                <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary-dark">
                                    {ROLE_LABELS[event.role] ?? event.role}
                                </span>
                            </div>

                            <dl className="mt-4 space-y-1.5 text-sm">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Event date</dt>
                                    <dd>{event.eventDate}</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Call time</dt>
                                    <dd>{formatDateTime(event.callTime)}</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Release</dt>
                                    <dd>{formatDateTime(event.releaseTime)}</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Travel</dt>
                                    <dd>{event.travelRequired ? "Required" : "Not required"}</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Assignment</dt>
                                    <dd className="capitalize">{event.status}</dd>
                                </div>
                            </dl>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
