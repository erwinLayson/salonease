import { useCallback, useEffect, useState } from "react";

import { api } from "../../lib/api";
import { toast } from "../../lib/toast";
import { formatDateTime, peso } from "../../lib/utils";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";

import type {
    EventAssignmentRole,
    EventDetail,
    EventStatus,
    EventType,
    OwnerService,
    OwnerStaff,
    Venue,
} from "../../types";

const STATUS_LABELS: Record<EventStatus, string> = {
    inquiry: "Inquiry",
    confirmed: "Confirmed",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
};

const TYPE_LABELS: Record<EventType, string> = {
    wedding: "Wedding",
    debut: "Debut",
    corporate: "Corporate",
    photoshoot: "Photoshoot",
    other: "Other",
};

const ROLE_OPTIONS = [
    { value: "lead", label: "Lead stylist" },
    { value: "assistant", label: "Assistant" },
    { value: "makeup", label: "Make-up" },
    { value: "hair", label: "Hair" },
    { value: "coordinator", label: "Coordinator" },
];

const TYPE_OPTIONS = [
    { value: "wedding", label: "Wedding" },
    { value: "debut", label: "Debut" },
    { value: "corporate", label: "Corporate" },
    { value: "photoshoot", label: "Photoshoot" },
    { value: "other", label: "Other" },
];

const MODE_OPTIONS = [
    { value: "own_vehicle", label: "Own vehicle" },
    { value: "ride_hailing", label: "Ride hailing" },
    { value: "van", label: "Van" },
    { value: "public", label: "Public transport" },
    { value: "other", label: "Other" },
];

const localInput = (value: string): string => {
    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
        date.getHours()
    )}:${pad(date.getMinutes())}`;
};

interface EventForm {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    venueId: string;
    venueName: string;
    venueAddress: string;
    title: string;
    eventType: EventType;
    startAt: string;
    endAt: string;
    travelBufferMinutes: string;
    notes: string;
}

const emptyForm = (): EventForm => {
    const start = new Date();
    start.setDate(start.getDate() + 7);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(15, 0, 0, 0);
    const pad = (part: number) => String(part).padStart(2, "0");
    const local = (date: Date) =>
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
            date.getHours()
        )}:${pad(date.getMinutes())}`;
    return {
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        venueId: "",
        venueName: "",
        venueAddress: "",
        title: "",
        eventType: "wedding",
        startAt: local(start),
        endAt: local(end),
        travelBufferMinutes: "60",
        notes: "",
    };
};

interface AssignmentDraft {
    staffId: string;
    role: EventAssignmentRole;
    callTime: string;
    releaseTime: string;
    travelRequired: boolean;
    commissionSharePercent: string;
}

const emptyAssignment = (event?: EventDetail): AssignmentDraft => ({
    staffId: "",
    role: "assistant",
    callTime: event ? localInput(event.startAt) : "",
    releaseTime: event ? localInput(event.endAt) : "",
    travelRequired: true,
    commissionSharePercent: "",
});

export default function EventsPage() {
    const [events, setEvents] = useState<EventDetail[]>([]);
    const [selected, setSelected] = useState<EventDetail | null>(null);
    const [staff, setStaff] = useState<OwnerStaff[]>([]);
    const [services, setServices] = useState<OwnerService[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<EventDetail | "new" | null>(null);
    const [form, setForm] = useState<EventForm>(emptyForm);
    const [serviceQty, setServiceQty] = useState<Record<number, string>>({});
    const [assignments, setAssignments] = useState<AssignmentDraft[]>([]);
    const [busy, setBusy] = useState(false);

    const [venueOpen, setVenueOpen] = useState(false);
    const [venueForm, setVenueForm] = useState({
        name: "",
        address: "",
        contactName: "",
        contactPhone: "",
        notes: "",
    });

    const [itineraryOpen, setItineraryOpen] = useState(false);
    const [itinerary, setItinerary] = useState<
        Array<{
            staffId: string;
            sequence: string;
            from: string;
            to: string;
            departAt: string;
            arriveAt: string;
            mode: string;
            notes: string;
        }>
    >([]);

    const [kitOpen, setKitOpen] = useState(false);
    const [kitValues, setKitValues] = useState<Record<number, string>>({});
    const [supplies, setSupplies] = useState<
        Array<{ id: number; name: string; unit: string; currentQuantity: number }>
    >([]);

    const reloadVenues = useCallback(async () => {
        try {
            const res = await api.get<{ data: Venue[] }>("/owner/venues");
            setVenues(res.data.data);
        } catch {
            // ignore
        }
    }, []);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<{ data: EventDetail[] }>("/owner/events");
            setEvents(res.data.data);
        } catch {
            // toast via interceptor
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    useEffect(() => {
        void api
            .get<{ data: OwnerStaff[] }>("/owner/staff")
            .then((res) => setStaff(res.data.data))
            .catch(() => {});
        void api
            .get<{ data: OwnerService[] }>("/owner/services", {
                params: { includeInactive: true },
            })
            .then((res) => setServices(res.data.data))
            .catch(() => {});
        void reloadVenues();
        void api
            .get<{ data: Array<{ id: number; name: string; unit: string; currentQuantity: number }> }>(
                "/owner/supplies"
            )
            .then((res) => setSupplies(res.data.data))
            .catch(() => {});
    }, [reloadVenues]);

    const openCreate = () => {
        setForm(emptyForm());
        setServiceQty({});
        setAssignments([]);
        setEditing("new");
    };

    const openEdit = (event: EventDetail) => {
        const matchingVenue = event.venue
            ? venues.find((v) => v.id === event.venue?.id)
            : undefined;
        setForm({
            firstName: "",
            lastName: "",
            phone: "",
            email: "",
            venueId: event.venue ? String(event.venue.id) : "",
            venueName: event.venue?.name ?? "",
            venueAddress: event.venue?.address ?? matchingVenue?.address ?? "",
            title: event.title,
            eventType: event.eventType,
            startAt: localInput(event.startAt),
            endAt: localInput(event.endAt),
            travelBufferMinutes: String(event.travelBufferMinutes),
            notes: event.notes ?? "",
        });
        const qty: Record<number, string> = {};
        for (const line of event.services) qty[line.serviceId] = String(line.quantity);
        setServiceQty(qty);
        setAssignments(
            event.assignments.map((assignment) => ({
                staffId: String(assignment.staffId),
                role: assignment.role,
                callTime: localInput(assignment.callTime),
                releaseTime: localInput(assignment.releaseTime),
                travelRequired: assignment.travelRequired,
                commissionSharePercent:
                    assignment.commissionSharePercent === null
                        ? ""
                        : String(assignment.commissionSharePercent),
            }))
        );
        setEditing(event);
    };

    const payloadFromForm = () => {
        const items = Object.entries(serviceQty)
            .map(([serviceId, value]) => ({
                serviceId: Number(serviceId),
                quantity: Number(value),
            }))
            .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);

        if (items.length === 0) {
            toast.error("Add at least one service to the event.");
            return null;
        }
        if (assignments.length === 0) {
            toast.error("Assign at least one staff member, including one lead.");
            return null;
        }
        if (assignments.filter((item) => item.role === "lead").length !== 1) {
            toast.error("Assign exactly one lead stylist.");
            return null;
        }

        const locName = form.venueName.trim() || form.venueAddress.trim();
        const locAddress = form.venueAddress.trim() || locName;

        return {
            customer: {
                firstName: form.firstName,
                lastName: form.lastName || null,
                phone: form.phone || null,
                email: form.email || null,
            },
            venueId: form.venueId ? Number(form.venueId) : null,
            venueName: locName,
            venueAddress: locAddress,
            venueLocation: {
                name: locName,
                address: locAddress,
            },
            title: form.title,
            eventType: form.eventType,
            startAt: form.startAt,
            endAt: form.endAt,
            travelBufferMinutes: Number(form.travelBufferMinutes || 60),
            notes: form.notes || null,
            services: items,
            assignments: assignments.map((item) => ({
                staffId: Number(item.staffId),
                role: item.role,
                callTime: item.callTime,
                releaseTime: item.releaseTime,
                travelRequired: item.travelRequired,
                commissionSharePercent: item.commissionSharePercent
                    ? Number(item.commissionSharePercent)
                    : null,
            })),
        };
    };

    const saveEvent = async () => {
        if (!form.title.trim()) {
            toast.error("Event title is required.");
            return;
        }
        if (editing === "new" && (!form.firstName.trim() || (!form.phone && !form.email))) {
            toast.error("Customer first name and at least one contact detail are required.");
            return;
        }
        if (!form.venueName.trim() && !form.venueAddress.trim()) {
            toast.error("Event location / address is required.");
            return;
        }
        const payload = payloadFromForm();
        if (!payload) return;

        setBusy(true);
        try {
            if (editing === "new") {
                await api.post("/owner/events", payload);
                toast.success("Event created.");
            } else if (editing) {
                await api.put(`/owner/events/${editing.id}`, payload);
                toast.success("Event updated.");
            }
            setEditing(null);
            setSelected(null);
            await Promise.all([reload(), reloadVenues()]);
        } finally {
            setBusy(false);
        }
    };

    const changeStatus = async (event: EventDetail, status: EventStatus) => {
        try {
            const res = await api.patch<{ data: EventDetail }>(
                `/owner/events/${event.id}/status`,
                { status }
            );
            setSelected(res.data.data);
            await reload();
        } catch {
            // toast via interceptor
        }
    };

    const openDetail = async (event: EventDetail) => {
        try {
            const res = await api.get<{ data: EventDetail }>(
                `/owner/events/${event.id}`
            );
            setSelected(res.data.data);
        } catch {
            // toast via interceptor
        }
    };

    const createVenue = async () => {
        if (!venueForm.name.trim() || !venueForm.address.trim()) {
            toast.error("Venue name and address are required.");
            return;
        }
        try {
            const res = await api.post<{ data: Venue }>("/owner/venues", {
                name: venueForm.name,
                address: venueForm.address,
                contactName: venueForm.contactName || null,
                contactPhone: venueForm.contactPhone || null,
                notes: venueForm.notes || null,
            });
            setVenues((current) => [...current, res.data.data]);
            setForm((current) => ({ ...current, venueId: String(res.data.data.id) }));
            setVenueForm({ name: "", address: "", contactName: "", contactPhone: "", notes: "" });
            toast.success("Venue created.");
        } catch {
            // toast via interceptor
        }
    };

    const openItinerary = (event: EventDetail) => {
        setItinerary(
            event.itinerary.map((segment) => ({
                staffId: segment.staffId ? String(segment.staffId) : "",
                sequence: String(segment.sequence),
                from: segment.from,
                to: segment.to,
                departAt: localInput(segment.departAt),
                arriveAt: localInput(segment.arriveAt),
                mode: segment.mode,
                notes: segment.notes ?? "",
            }))
        );
        setItineraryOpen(true);
    };

    const saveItinerary = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            const items = itinerary.map((segment, index) => ({
                staffId: segment.staffId ? Number(segment.staffId) : null,
                sequence: Number(segment.sequence || index + 1),
                from: segment.from,
                to: segment.to,
                departAt: segment.departAt,
                arriveAt: segment.arriveAt,
                mode: segment.mode,
                notes: segment.notes || null,
            }));
            const res = await api.put<{ data: EventDetail }>(
                `/owner/events/${selected.id}/itinerary`,
                { items }
            );
            setSelected(res.data.data);
            setItineraryOpen(false);
            toast.success("Itinerary saved.");
        } finally {
            setBusy(false);
        }
    };

    const openKit = (event: EventDetail) => {
        const values: Record<number, string> = {};
        for (const line of event.supplies) values[line.supplyId] = String(line.plannedQuantity);
        setKitValues(values);
        setKitOpen(true);
    };

    const saveKit = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            const items = Object.entries(kitValues)
                .map(([supplyId, value]) => ({
                    supplyId: Number(supplyId),
                    plannedQuantity: Number(value),
                }))
                .filter((item) => Number.isFinite(item.plannedQuantity) && item.plannedQuantity > 0);
            const res = await api.put<{ data: EventDetail }>(
                `/owner/events/${selected.id}/supplies`,
                { items }
            );
            setSelected(res.data.data);
            setKitOpen(false);
            toast.success("Event kit saved.");
        } finally {
            setBusy(false);
        }
    };

    const issueKit = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            const res = await api.post<{ data: EventDetail }>(
                `/owner/events/${selected.id}/supplies/issue`
            );
            setSelected(res.data.data);
            toast.success("Event kit issued and stock deducted.");
        } finally {
            setBusy(false);
        }
    };

    const nextStatuses = (status: EventStatus): EventStatus[] => {
        if (status === "inquiry") return ["confirmed", "cancelled"];
        if (status === "confirmed") return ["in_progress", "completed", "cancelled"];
        if (status === "in_progress") return ["completed", "cancelled"];
        return [];
    };

    return (
        <div className="grid gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Events</h1>
                    <p className="mt-1 text-sm text-muted">
                        Weddings and on-location styling: venues, staff assignments, travel
                        itineraries and kits.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setVenueOpen(true)}>
                        Venues
                    </Button>
                    <Button onClick={openCreate}>New event</Button>
                </div>
            </header>

            <Card title="Event calendar">
                {loading ? (
                    <p className="py-8 text-center text-sm text-muted">Loading events…</p>
                ) : events.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted">
                        No events yet. Create a wedding or on-location assignment to get started.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                                    <th className="px-3 py-2">Reference</th>
                                    <th className="px-3 py-2">Event</th>
                                    <th className="px-3 py-2">When</th>
                                    <th className="px-3 py-2">Venue</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2">Total</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map((event) => (
                                    <tr key={event.id} className="border-b border-border/70">
                                        <td className="px-3 py-3 font-mono text-xs">
                                            {event.reference}
                                        </td>
                                        <td className="px-3 py-3">
                                            <p className="font-medium">{event.title}</p>
                                            <p className="text-xs text-muted">
                                                {TYPE_LABELS[event.eventType]} ·{" "}
                                                {event.customer.name}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3 text-xs">
                                            {formatDateTime(event.startAt)}
                                        </td>
                                        <td className="px-3 py-3">
                                            <p className="font-medium">{event.venue?.name ?? "—"}</p>
                                            {event.venue?.address && (
                                                <p
                                                    className="max-w-[180px] truncate text-xs text-muted"
                                                    title={event.venue.address}
                                                >
                                                    {event.venue.address}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary-dark">
                                                {STATUS_LABELS[event.status]}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">{peso(event.total)}</td>
                                        <td className="px-3 py-3">
                                            <button
                                                type="button"
                                                onClick={() => void openDetail(event)}
                                                className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-charcoal/5"
                                            >
                                                Open
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {selected && (
                <Card
                    title={`${selected.title} · ${selected.reference}`}
                    actions={
                        <div className="flex flex-wrap gap-1.5">
                            {nextStatuses(selected.status).map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => void changeStatus(selected, status)}
                                    className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-charcoal/5"
                                >
                                    {STATUS_LABELS[status]}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => openEdit(selected)}
                                className="rounded-lg border border-primary px-2 py-1 text-xs text-primary-dark hover:bg-primary-light/30"
                            >
                                Edit
                            </button>
                        </div>
                    }
                >
                    <div className="grid gap-5 lg:grid-cols-2">
                        <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                                Details
                            </h3>
                            <dl className="space-y-1.5 text-sm">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Customer</dt>
                                    <dd>{selected.customer.name}</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Venue / Location</dt>
                                    <dd className="font-medium text-right">{selected.venue?.name ?? "To be confirmed"}</dd>
                                </div>
                                {selected.venue?.address && (
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-muted">Address</dt>
                                        <dd className="max-w-[260px] text-right text-xs text-muted">{selected.venue.address}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Event window</dt>
                                    <dd>
                                        {formatDateTime(selected.startAt)} –{" "}
                                        {formatDateTime(selected.endAt)}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Travel buffer</dt>
                                    <dd>{selected.travelBufferMinutes} min</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Total</dt>
                                    <dd className="font-semibold">{peso(selected.total)}</dd>
                                </div>
                            </dl>

                            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted">
                                Services
                            </h3>
                            <ul className="space-y-1 text-sm">
                                {selected.services.map((line) => (
                                    <li key={line.serviceId} className="flex justify-between gap-3">
                                        <span>
                                            {line.name} × {line.quantity}
                                        </span>
                                        <span>{peso(line.price * line.quantity)}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                                Staff assignments
                            </h3>
                            {selected.assignments.length === 0 ? (
                                <p className="text-sm text-muted">No staff assigned.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {selected.assignments.map((assignment) => (
                                        <li
                                            key={assignment.id}
                                            className="rounded-xl border border-border p-3 text-sm"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-medium">
                                                    {assignment.staffName}
                                                </span>
                                                <span className="text-xs capitalize text-muted">
                                                    {assignment.role}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-muted">
                                                Call {formatDateTime(assignment.callTime)} · Release{" "}
                                                {formatDateTime(assignment.releaseTime)}
                                                {assignment.travelRequired
                                                    ? " · travel required"
                                                    : " · no travel"}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => openItinerary(selected)}
                                >
                                    Travel itinerary
                                </Button>
                                <Button variant="secondary" onClick={() => openKit(selected)}>
                                    Event kit
                                </Button>
                            </div>
                        </section>
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                        <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                                Itinerary
                            </h3>
                            {selected.itinerary.length === 0 ? (
                                <p className="text-sm text-muted">
                                    No travel segments. Add them before the event.
                                </p>
                            ) : (
                                <ol className="space-y-2 text-sm">
                                    {selected.itinerary.map((segment) => (
                                        <li
                                            key={segment.id}
                                            className="rounded-xl border border-border p-3"
                                        >
                                            <p className="font-medium">
                                                {segment.from} → {segment.to}
                                            </p>
                                            <p className="mt-1 text-xs text-muted">
                                                {formatDateTime(segment.departAt)} –{" "}
                                                {formatDateTime(segment.arriveAt)} ·{" "}
                                                {segment.staffName ?? "Whole team"}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </section>

                        <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                                Event kit
                            </h3>
                            {selected.supplies.length === 0 ? (
                                <p className="text-sm text-muted">No supplies planned.</p>
                            ) : (
                                <ul className="space-y-1.5 text-sm">
                                    {selected.supplies.map((line) => (
                                        <li
                                            key={line.supplyId}
                                            className="flex items-center justify-between gap-2"
                                        >
                                            <span>
                                                {line.name} · planned {line.plannedQuantity}{" "}
                                                {line.unit}
                                            </span>
                                            <span className="text-xs text-muted">
                                                issued {line.issuedQuantity} · {line.status}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="mt-3">
                                <Button
                                    variant="secondary"
                                    onClick={() => void issueKit()}
                                    loading={busy}
                                >
                                    Issue kit
                                </Button>
                            </div>
                        </section>
                    </div>
                </Card>
            )}

            {editing && (
                <Modal
                    title={editing === "new" ? "New event" : `Edit ${editing.title}`}
                    onClose={() => setEditing(null)}
                    wide
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        {editing === "new" && (
                            <>
                                <Field
                                    label="Customer first name *"
                                    placeholder="e.g. Maria"
                                    value={form.firstName}
                                    onChange={(value) =>
                                        setForm((current) => ({ ...current, firstName: value }))
                                    }
                                />
                                <Field
                                    label="Customer last name"
                                    placeholder="e.g. Santos"
                                    value={form.lastName}
                                    onChange={(value) =>
                                        setForm((current) => ({ ...current, lastName: value }))
                                    }
                                />
                                <Field
                                    label="Phone"
                                    placeholder="e.g. 09171234567"
                                    value={form.phone}
                                    onChange={(value) =>
                                        setForm((current) => ({ ...current, phone: value }))
                                    }
                                />
                                <Field
                                    label="Email"
                                    placeholder="e.g. maria@example.com"
                                    value={form.email}
                                    onChange={(value) =>
                                        setForm((current) => ({ ...current, email: value }))
                                    }
                                />
                            </>
                        )}
                        <Field
                            label="Event title *"
                            placeholder="e.g. Maria & Juan Wedding"
                            value={form.title}
                            onChange={(value) =>
                                setForm((current) => ({ ...current, title: value }))
                            }
                        />
                        <Select
                            label="Event type"
                            value={form.eventType}
                            onChange={(value) =>
                                setForm((current) => ({
                                    ...current,
                                    eventType: value as EventType,
                                }))
                            }
                            options={TYPE_OPTIONS}
                        />

                        {/* Location / Venue details */}
                        <div className="sm:col-span-2 rounded-xl border border-border bg-charcoal/[0.02] p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                                    Event Location / Venue
                                </span>
                                {venues.length > 0 && (
                                    <span className="text-xs text-muted">
                                        Type directly or pick a saved venue
                                    </span>
                                )}
                            </div>

                            {venues.length > 0 && (
                                <Select
                                    label="Quick-pick saved venue (optional)"
                                    value={form.venueId}
                                    onChange={(value) => {
                                        const selectedVenue = venues.find(
                                            (v) => String(v.id) === value
                                        );
                                        setForm((current) => ({
                                            ...current,
                                            venueId: value,
                                            venueName: selectedVenue ? selectedVenue.name : current.venueName,
                                            venueAddress: selectedVenue ? selectedVenue.address : current.venueAddress,
                                        }));
                                    }}
                                    options={[
                                        { value: "", label: "Custom location (type below)..." },
                                        ...venues.map((venue) => ({
                                            value: String(venue.id),
                                            label: `${venue.name}${venue.address ? ` — ${venue.address}` : ""}`,
                                        })),
                                    ]}
                                />
                            )}

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field
                                    label="Location / Venue name *"
                                    placeholder="e.g. Manila Hotel, Bride's Residence, San Agustin Church"
                                    value={form.venueName}
                                    onChange={(value) =>
                                        setForm((current) => {
                                            const matches = venues.find(
                                                (v) => v.name.toLowerCase() === value.trim().toLowerCase()
                                            );
                                            return {
                                                ...current,
                                                venueName: value,
                                                venueId: matches ? String(matches.id) : "",
                                            };
                                        })
                                    }
                                />
                                <Field
                                    label="Location address *"
                                    placeholder="e.g. One Rizal Park, Ermita, Manila"
                                    value={form.venueAddress}
                                    onChange={(value) =>
                                        setForm((current) => ({
                                            ...current,
                                            venueAddress: value,
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        <Field
                            label="Travel buffer (minutes)"
                            type="number"
                            value={form.travelBufferMinutes}
                            onChange={(value) =>
                                setForm((current) => ({
                                    ...current,
                                    travelBufferMinutes: value,
                                }))
                            }
                        />
                        <Field
                            label="Start"
                            type="datetime-local"
                            value={form.startAt}
                            onChange={(value) =>
                                setForm((current) => ({ ...current, startAt: value }))
                            }
                        />
                        <Field
                            label="End"
                            type="datetime-local"
                            value={form.endAt}
                            onChange={(value) =>
                                setForm((current) => ({ ...current, endAt: value }))
                            }
                        />
                        <Field
                            label="Notes"
                            placeholder="e.g. Bring extra curling irons, parking gate pass needed"
                            value={form.notes}
                            onChange={(value) =>
                                setForm((current) => ({ ...current, notes: value }))
                            }
                        />
                    </div>

                    <div className="mt-5">
                        <p className="mb-2 text-sm font-medium">Services</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {services.map((service) => (
                                <div
                                    key={service.id}
                                    className="flex items-center gap-2 rounded-lg border border-border p-2"
                                >
                                    <span className="min-w-0 flex-1 truncate text-sm">
                                        {service.name}
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={serviceQty[service.id] ?? ""}
                                        onChange={(event) =>
                                            setServiceQty((current) => ({
                                                ...current,
                                                [service.id]: event.target.value,
                                            }))
                                        }
                                        className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-right text-sm"
                                        aria-label={`Quantity for ${service.name}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium">Staff assignments</p>
                            <button
                                type="button"
                                onClick={() =>
                                    setAssignments((current) => [
                                        ...current,
                                        emptyAssignment(editing === "new" ? undefined : editing),
                                    ])
                                }
                                className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-charcoal/5"
                            >
                                Add staff
                            </button>
                        </div>
                        <div className="space-y-2">
                            {assignments.map((assignment, index) => (
                                <div
                                    key={index}
                                    className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2"
                                >
                                    <Select
                                        label="Staff"
                                        value={assignment.staffId}
                                        onChange={(value) =>
                                            setAssignments((current) =>
                                                current.map((item, i) =>
                                                    i === index ? { ...item, staffId: value } : item
                                                )
                                            )
                                        }
                                        options={[
                                            { value: "", label: "Choose staff" },
                                            ...staff.map((member) => ({
                                                value: String(member.id),
                                                label: `${member.first_name} ${member.last_name}`,
                                            })),
                                        ]}
                                    />
                                    <Select
                                        label="Role"
                                        value={assignment.role}
                                        onChange={(value) =>
                                            setAssignments((current) =>
                                                current.map((item, i) =>
                                                    i === index
                                                        ? {
                                                              ...item,
                                                              role: value as EventAssignmentRole,
                                                          }
                                                        : item
                                                )
                                            )
                                        }
                                        options={ROLE_OPTIONS}
                                    />
                                    <Field
                                        label="Call time"
                                        type="datetime-local"
                                        value={assignment.callTime}
                                        onChange={(value) =>
                                            setAssignments((current) =>
                                                current.map((item, i) =>
                                                    i === index ? { ...item, callTime: value } : item
                                                )
                                            )
                                        }
                                    />
                                    <Field
                                        label="Release time"
                                        type="datetime-local"
                                        value={assignment.releaseTime}
                                        onChange={(value) =>
                                            setAssignments((current) =>
                                                current.map((item, i) =>
                                                    i === index
                                                        ? { ...item, releaseTime: value }
                                                        : item
                                                )
                                            )
                                        }
                                    />
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={assignment.travelRequired}
                                            onChange={(event) =>
                                                setAssignments((current) =>
                                                    current.map((item, i) =>
                                                        i === index
                                                            ? {
                                                                  ...item,
                                                                  travelRequired:
                                                                      event.target.checked,
                                                              }
                                                            : item
                                                    )
                                                )
                                            }
                                        />
                                        Travel required
                                    </label>
                                    <div className="flex items-end justify-between gap-2">
                                        <Field
                                            label="Commission share %"
                                            type="number"
                                            value={assignment.commissionSharePercent}
                                            onChange={(value) =>
                                                setAssignments((current) =>
                                                    current.map((item, i) =>
                                                        i === index
                                                            ? {
                                                                  ...item,
                                                                  commissionSharePercent: value,
                                                              }
                                                            : item
                                                    )
                                                )
                                            }
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setAssignments((current) =>
                                                    current.filter((_, i) => i !== index)
                                                )
                                            }
                                            className="mb-0.5 rounded-lg border border-danger-line px-2 py-2 text-xs text-danger hover:bg-danger-bg"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEditing(null)}>
                            Cancel
                        </Button>
                        <Button onClick={() => void saveEvent()} loading={busy}>
                            Save event
                        </Button>
                    </div>
                </Modal>
            )}

            {venueOpen && (
                <Modal title="Venues" onClose={() => setVenueOpen(false)}>
                    <ul className="mb-4 space-y-1 text-sm">
                        {venues.map((venue) => (
                            <li key={venue.id} className="flex justify-between gap-2">
                                <span>{venue.name}</span>
                                <span className="text-xs text-muted">{venue.address}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                            label="Venue name"
                            value={venueForm.name}
                            onChange={(value) =>
                                setVenueForm((current) => ({ ...current, name: value }))
                            }
                        />
                        <Field
                            label="Address"
                            value={venueForm.address}
                            onChange={(value) =>
                                setVenueForm((current) => ({ ...current, address: value }))
                            }
                        />
                        <Field
                            label="Contact name"
                            value={venueForm.contactName}
                            onChange={(value) =>
                                setVenueForm((current) => ({ ...current, contactName: value }))
                            }
                        />
                        <Field
                            label="Contact phone"
                            value={venueForm.contactPhone}
                            onChange={(value) =>
                                setVenueForm((current) => ({ ...current, contactPhone: value }))
                            }
                        />
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button onClick={() => void createVenue()}>Add venue</Button>
                    </div>
                </Modal>
            )}

            {itineraryOpen && selected && (
                <Modal
                    title={`Travel itinerary — ${selected.title}`}
                    onClose={() => setItineraryOpen(false)}
                >
                    <div className="space-y-2">
                        {itinerary.map((segment, index) => (
                            <div
                                key={index}
                                className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2"
                            >
                                <Select
                                    label="Staff"
                                    value={segment.staffId}
                                    onChange={(value) =>
                                        setItinerary((current) =>
                                            current.map((item, i) =>
                                                i === index ? { ...item, staffId: value } : item
                                            )
                                        )
                                    }
                                    options={[
                                        { value: "", label: "Whole team" },
                                        ...selected.assignments.map((assignment) => ({
                                            value: String(assignment.staffId),
                                            label: assignment.staffName,
                                        })),
                                    ]}
                                />
                                <Field
                                    label="Sequence"
                                    type="number"
                                    value={segment.sequence}
                                    onChange={(value) =>
                                        setItinerary((current) =>
                                            current.map((item, i) =>
                                                i === index ? { ...item, sequence: value } : item
                                            )
                                        )
                                    }
                                />
                                <Field
                                    label="From"
                                    value={segment.from}
                                    onChange={(value) =>
                                        setItinerary((current) =>
                                            current.map((item, i) =>
                                                i === index ? { ...item, from: value } : item
                                            )
                                        )
                                    }
                                />
                                <Field
                                    label="To"
                                    value={segment.to}
                                    onChange={(value) =>
                                        setItinerary((current) =>
                                            current.map((item, i) =>
                                                i === index ? { ...item, to: value } : item
                                            )
                                        )
                                    }
                                />
                                <Field
                                    label="Depart"
                                    type="datetime-local"
                                    value={segment.departAt}
                                    onChange={(value) =>
                                        setItinerary((current) =>
                                            current.map((item, i) =>
                                                i === index ? { ...item, departAt: value } : item
                                            )
                                        )
                                    }
                                />
                                <Field
                                    label="Arrive"
                                    type="datetime-local"
                                    value={segment.arriveAt}
                                    onChange={(value) =>
                                        setItinerary((current) =>
                                            current.map((item, i) =>
                                                i === index ? { ...item, arriveAt: value } : item
                                            )
                                        )
                                    }
                                />
                                <Select
                                    label="Mode"
                                    value={segment.mode}
                                    onChange={(value) =>
                                        setItinerary((current) =>
                                            current.map((item, i) =>
                                                i === index ? { ...item, mode: value } : item
                                            )
                                        )
                                    }
                                    options={MODE_OPTIONS}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setItinerary((current) =>
                                            current.filter((_, i) => i !== index)
                                        )
                                    }
                                    className="mt-6 rounded-lg border border-danger-line px-2 py-2 text-xs text-danger hover:bg-danger-bg"
                                >
                                    Remove segment
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex justify-between">
                        <button
                            type="button"
                            onClick={() =>
                                setItinerary((current) => [
                                    ...current,
                                    {
                                        staffId: "",
                                        sequence: String(current.length + 1),
                                        from: "",
                                        to: selected.venue?.address || selected.venue?.name || "",
                                        departAt: localInput(selected.startAt),
                                        arriveAt: localInput(selected.startAt),
                                        mode: "other",
                                        notes: "",
                                    },
                                ])
                            }
                            className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-charcoal/5"
                        >
                            Add segment
                        </button>
                        <Button onClick={() => void saveItinerary()} loading={busy}>
                            Save itinerary
                        </Button>
                    </div>
                </Modal>
            )}

            {kitOpen && selected && (
                <Modal
                    title={`Event kit — ${selected.title}`}
                    onClose={() => setKitOpen(false)}
                >
                    <p className="mb-3 text-sm text-muted">
                        Planned quantities are reserved when you issue the kit. Issuing
                        deducts stock immediately.
                    </p>
                    <div className="max-h-[55vh] space-y-2 overflow-y-auto">
                        {supplies.map((supply) => (
                            <div
                                key={supply.id}
                                className="flex items-center gap-3 rounded-xl border border-border p-2"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {supply.name}
                                    </p>
                                    <p className="text-xs text-muted">
                                        {supply.currentQuantity} {supply.unit} on hand
                                    </p>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    value={kitValues[supply.id] ?? ""}
                                    onChange={(event) =>
                                        setKitValues((current) => ({
                                            ...current,
                                            [supply.id]: event.target.value,
                                        }))
                                    }
                                    className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-right text-sm"
                                    aria-label={`Planned quantity for ${supply.name}`}
                                />
                                <span className="w-12 text-xs text-muted">{supply.unit}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setKitOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="secondary" onClick={() => void issueKit()} loading={busy}>
                            Issue kit
                        </Button>
                        <Button onClick={() => void saveKit()} loading={busy}>
                            Save kit
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
