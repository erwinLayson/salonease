import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "../../lib/api";
import { toast } from "../../lib/toast";
import { formatDateTime, peso } from "../../lib/utils";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";

import {
    FiArrowRight,
    FiCalendar,
    FiEdit2,
    FiGrid,
    FiList,
    FiMail,
    FiMapPin,
    FiPackage,
    FiPhone,
    FiSearch,
    FiTruck,
    FiUsers,
    FiX,
} from "react-icons/fi";

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

const STATUS_BADGE_CLASSES: Record<EventStatus, string> = {
    inquiry: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    confirmed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    in_progress: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
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

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
    const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

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

    const metrics = useMemo(() => {
        const total = events.length;
        const confirmed = events.filter((e) => e.status === "confirmed").length;
        const inProgress = events.filter((e) => e.status === "in_progress").length;
        const completed = events.filter((e) => e.status === "completed").length;
        const inquiry = events.filter((e) => e.status === "inquiry").length;
        const totalRevenue = events
            .filter((e) => e.status !== "cancelled")
            .reduce((sum, e) => sum + e.total, 0);
        return { total, confirmed, inProgress, completed, inquiry, totalRevenue };
    }, [events]);

    const filteredEvents = useMemo(() => {
        const term = search.trim().toLowerCase();
        return events.filter((event) => {
            if (statusFilter !== "all" && event.status !== statusFilter) return false;
            if (!term) return true;
            const refMatch = event.reference.toLowerCase().includes(term);
            const titleMatch = event.title.toLowerCase().includes(term);
            const customerMatch = event.customer.name.toLowerCase().includes(term);
            const venueNameMatch = event.venue?.name?.toLowerCase().includes(term) ?? false;
            const venueAddrMatch = event.venue?.address?.toLowerCase().includes(term) ?? false;
            const typeMatch = TYPE_LABELS[event.eventType]?.toLowerCase().includes(term) ?? false;
            return refMatch || titleMatch || customerMatch || venueNameMatch || venueAddrMatch || typeMatch;
        });
    }, [events, search, statusFilter]);

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
        setSelected(null);
        setEditing(event);
    };

    const toggleService = (serviceId: number) => {
        setServiceQty((current) => {
            const next = { ...current };
            const currentQty = Number(next[serviceId]);
            if (next[serviceId] !== undefined && next[serviceId] !== "" && currentQty > 0) {
                delete next[serviceId];
            } else {
                next[serviceId] = "1";
            }
            return next;
        });
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
            toast.success(`Event status updated to ${STATUS_LABELS[status]}.`);
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

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
                    <span className="text-xs font-medium text-muted">Total Events</span>
                    <p className="mt-1 text-2xl font-bold text-charcoal">{metrics.total}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
                    <span className="text-xs font-medium text-muted">Confirmed</span>
                    <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {metrics.confirmed}
                    </p>
                </div>
                <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
                    <span className="text-xs font-medium text-muted">In Progress</span>
                    <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {metrics.inProgress}
                    </p>
                </div>
                <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
                    <span className="text-xs font-medium text-muted">Completed</span>
                    <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {metrics.completed}
                    </p>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-xl border border-border bg-surface p-3.5 shadow-xs">
                    <span className="text-xs font-medium text-muted">Total Revenue</span>
                    <p className="mt-1 text-2xl font-bold text-primary-dark">
                        {peso(metrics.totalRevenue)}
                    </p>
                </div>
            </div>

            {/* Search, Filter & View Controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search events, clients, venues, or reference..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-border bg-surface pl-10 pr-9 py-2 text-sm text-charcoal placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-charcoal p-1"
                            aria-label="Clear search"
                        >
                            <FiX className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Status Tabs */}
                    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-charcoal/[0.02] p-1 text-xs">
                        {(
                            [
                                { key: "all", label: `All (${metrics.total})` },
                                { key: "confirmed", label: `Confirmed (${metrics.confirmed})` },
                                { key: "in_progress", label: `In progress (${metrics.inProgress})` },
                                { key: "completed", label: `Completed (${metrics.completed})` },
                                { key: "inquiry", label: `Inquiry (${metrics.inquiry})` },
                            ] as const
                        ).map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setStatusFilter(tab.key)}
                                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                                    statusFilter === tab.key
                                        ? "bg-surface text-charcoal shadow-xs border border-border"
                                        : "text-muted hover:text-charcoal"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* View Switcher */}
                    <div className="flex items-center gap-1 rounded-xl border border-border bg-charcoal/[0.02] p-1">
                        <button
                            type="button"
                            onClick={() => setViewMode("cards")}
                            title="Cards view"
                            className={`rounded-lg p-1.5 transition-colors ${
                                viewMode === "cards"
                                    ? "bg-surface text-primary shadow-xs border border-border"
                                    : "text-muted hover:text-charcoal"
                            }`}
                        >
                            <FiGrid className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            title="Table view"
                            className={`rounded-lg p-1.5 transition-colors ${
                                viewMode === "table"
                                    ? "bg-surface text-primary shadow-xs border border-border"
                                    : "text-muted hover:text-charcoal"
                            }`}
                        >
                            <FiList className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Events Main Content */}
            {loading ? (
                <div className="rounded-2xl border border-border bg-surface p-12 text-center text-sm text-muted">
                    Loading events…
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface p-12 text-center">
                    <p className="text-base font-semibold text-charcoal">No events found</p>
                    <p className="mt-1 text-sm text-muted">
                        {search || statusFilter !== "all"
                            ? "Try adjusting your search query or status filter."
                            : "Create your first wedding or on-location styling assignment."}
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                        {search || statusFilter !== "all" ? (
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setSearch("");
                                    setStatusFilter("all");
                                }}
                            >
                                Reset filters
                            </Button>
                        ) : (
                            <Button onClick={openCreate}>Create event</Button>
                        )}
                    </div>
                </div>
            ) : viewMode === "cards" ? (
                /* Cards View */
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredEvents.map((event) => {
                        return (
                            <div
                                key={event.id}
                                onClick={() => void openDetail(event)}
                                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
                            >
                                <div>
                                    <div className="mb-2.5 flex items-center justify-between gap-2">
                                        <span className="rounded-md border border-border/60 bg-charcoal/[0.04] px-2 py-0.5 font-mono text-xs font-semibold text-charcoal/80">
                                            {event.reference}
                                        </span>
                                        <span
                                            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                                STATUS_BADGE_CLASSES[event.status]
                                            }`}
                                        >
                                            {STATUS_LABELS[event.status]}
                                        </span>
                                    </div>

                                    <div className="mb-3">
                                        <h3 className="line-clamp-1 text-base font-semibold text-charcoal transition-colors group-hover:text-primary">
                                            {event.title}
                                        </h3>
                                        <span className="mt-0.5 inline-block text-xs font-medium text-muted">
                                            {TYPE_LABELS[event.eventType]}
                                        </span>
                                    </div>

                                    <div className="space-y-2 border-t border-border/50 pt-3 text-xs text-charcoal/80">
                                        <div className="flex items-center gap-2 text-muted">
                                            <FiUsers className="h-3.5 w-3.5 shrink-0 text-muted" />
                                            <span className="truncate font-medium text-charcoal">
                                                {event.customer.name}
                                            </span>
                                            {event.customer.phone && (
                                                <span className="text-muted">· {event.customer.phone}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 text-muted">
                                            <FiCalendar className="h-3.5 w-3.5 shrink-0 text-muted" />
                                            <span className="truncate">
                                                {formatDateTime(event.startAt)}
                                            </span>
                                        </div>

                                        <div className="flex items-start gap-2 text-muted">
                                            <FiMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium text-charcoal">
                                                    {event.venue?.name || "To be confirmed"}
                                                </p>
                                                {event.venue?.address && (
                                                    <p
                                                        className="truncate text-[11px] text-muted"
                                                        title={event.venue.address}
                                                    >
                                                        {event.venue.address}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {event.assignments && event.assignments.length > 0 && (
                                            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted">
                                                <span className="font-medium text-charcoal">Team:</span>
                                                <span className="truncate">
                                                    {event.assignments.find((a) => a.role === "lead")?.staffName ??
                                                        event.assignments[0]?.staffName}
                                                    {event.assignments.length > 1 &&
                                                        ` +${event.assignments.length - 1} crew`}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                                    <div>
                                        <span className="block text-[10px] font-semibold uppercase text-muted">
                                            Total
                                        </span>
                                        <span className="text-sm font-bold text-primary-dark">
                                            {peso(event.total)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {nextStatuses(event.status).length > 0 && (
                                            <select
                                                value=""
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    if (e.target.value) {
                                                        void changeStatus(event, e.target.value as EventStatus);
                                                    }
                                                }}
                                                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-charcoal outline-none hover:border-primary cursor-pointer transition-colors"
                                                title="Quick status change"
                                            >
                                                <option value="" disabled>Status…</option>
                                                {nextStatuses(event.status).map((st) => (
                                                    <option key={st} value={st}>
                                                        → {STATUS_LABELS[st]}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void openDetail(event);
                                            }}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-charcoal transition-colors hover:border-primary hover:bg-primary-light/10 hover:text-primary-dark"
                                        >
                                            <span>Open</span>
                                            <FiArrowRight className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Table View */
                <Card>
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
                                {filteredEvents.map((event) => (
                                    <tr
                                        key={event.id}
                                        onClick={() => void openDetail(event)}
                                        className="border-b border-border/70 hover:bg-charcoal/[0.02] cursor-pointer transition-colors"
                                    >
                                        <td className="px-3 py-3 font-mono text-xs font-semibold">
                                            {event.reference}
                                        </td>
                                        <td className="px-3 py-3">
                                            <p className="font-medium">{event.title}</p>
                                            <p className="text-xs text-muted">
                                                {TYPE_LABELS[event.eventType]} · {event.customer.name}
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
                                            <span
                                                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                                    STATUS_BADGE_CLASSES[event.status]
                                                }`}
                                            >
                                                {STATUS_LABELS[event.status]}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 font-semibold text-charcoal">
                                            {peso(event.total)}
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {nextStatuses(event.status).length > 0 && (
                                                    <select
                                                        value=""
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            if (e.target.value) {
                                                                void changeStatus(event, e.target.value as EventStatus);
                                                            }
                                                        }}
                                                        className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-charcoal outline-none hover:border-primary cursor-pointer transition-colors"
                                                        title="Quick status change"
                                                    >
                                                        <option value="" disabled>Status…</option>
                                                        {nextStatuses(event.status).map((st) => (
                                                            <option key={st} value={st}>
                                                                → {STATUS_LABELS[st]}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void openDetail(event);
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs hover:border-primary hover:text-primary-dark hover:bg-primary-light/10"
                                                >
                                                    <span>Open</span>
                                                    <FiArrowRight className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Event Details Modal */}
            {selected && !itineraryOpen && !kitOpen && (
                <Modal
                    title={`${selected.title} · ${selected.reference}`}
                    onClose={() => setSelected(null)}
                    extraWide
                    footer={
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setSelected(null)}>
                                Close
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-6">
                        {/* Status Strip & Quick Action Transitions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-charcoal/[0.02] p-3.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                        STATUS_BADGE_CLASSES[selected.status]
                                    }`}
                                >
                                    {STATUS_LABELS[selected.status]}
                                </span>
                                <span className="rounded-full bg-charcoal/[0.06] px-2.5 py-0.5 text-xs font-medium text-charcoal">
                                    {TYPE_LABELS[selected.eventType]}
                                </span>
                                <span className="text-xs text-muted">
                                    Window: {formatDateTime(selected.startAt)} –{" "}
                                    {formatDateTime(selected.endAt)}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {nextStatuses(selected.status).map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => void changeStatus(selected, status)}
                                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                                            status === "completed"
                                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                : status === "confirmed"
                                                  ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                                  : status === "in_progress"
                                                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                                    : "border-border text-muted hover:bg-charcoal/5 hover:text-charcoal"
                                        }`}
                                    >
                                        Mark as {STATUS_LABELS[status]}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => openEdit(selected)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-primary px-2.5 py-1 text-xs font-medium text-primary-dark transition-colors hover:bg-primary-light/20"
                                >
                                    <FiEdit2 className="h-3 w-3" />
                                    <span>Edit</span>
                                </button>
                            </div>
                        </div>

                        {/* Customer & Location & Services 2-Column Grid */}
                        <div className="grid gap-5 md:grid-cols-2">
                            {/* Column 1: Customer & Venue */}
                            <div className="space-y-4 rounded-xl border border-border p-4">
                                <div className="border-b border-border/60 pb-2">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                                        Customer & Venue Details
                                    </h3>
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div>
                                        <span className="block text-xs text-muted">Customer</span>
                                        <p className="font-semibold text-charcoal">
                                            {selected.customer.name}
                                        </p>
                                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
                                            {selected.customer.phone && (
                                                <a
                                                    href={`tel:${selected.customer.phone}`}
                                                    className="inline-flex items-center gap-1 hover:text-primary hover:underline"
                                                >
                                                    <FiPhone className="h-3 w-3" />
                                                    {selected.customer.phone}
                                                </a>
                                            )}
                                            {selected.customer.email && (
                                                <a
                                                    href={`mailto:${selected.customer.email}`}
                                                    className="inline-flex items-center gap-1 hover:text-primary hover:underline"
                                                >
                                                    <FiMail className="h-3 w-3" />
                                                    {selected.customer.email}
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-t border-border/40 pt-2">
                                        <span className="block text-xs text-muted">
                                            Venue / Location
                                        </span>
                                        <p className="font-medium text-charcoal">
                                            {selected.venue?.name || "To be confirmed"}
                                        </p>
                                        {selected.venue?.address && (
                                            <p className="mt-0.5 flex items-start gap-1 text-xs text-muted">
                                                <FiMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                                <span>{selected.venue.address}</span>
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-2 text-xs">
                                        <div>
                                            <span className="block text-muted">Travel buffer</span>
                                            <span className="font-medium text-charcoal">
                                                {selected.travelBufferMinutes} minutes
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-muted">Event Type</span>
                                            <span className="font-medium text-charcoal">
                                                {TYPE_LABELS[selected.eventType]}
                                            </span>
                                        </div>
                                    </div>

                                    {selected.notes && (
                                        <div className="border-t border-border/40 pt-2">
                                            <span className="block text-xs text-muted">Notes</span>
                                            <p className="rounded-lg border border-border/60 bg-charcoal/[0.02] p-2 text-xs italic text-charcoal/80">
                                                "{selected.notes}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Column 2: Services & Pricing */}
                            <div className="flex flex-col justify-between rounded-xl border border-border p-4">
                                <div>
                                    <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                                            Services Booked
                                        </h3>
                                        <span className="text-xs font-medium text-muted">
                                            {selected.services.length}{" "}
                                            {selected.services.length === 1 ? "service" : "services"}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {selected.services.map((line) => (
                                            <div
                                                key={line.serviceId}
                                                className="flex items-center justify-between gap-3 border-b border-border/30 py-1 text-sm last:border-0"
                                            >
                                                <div>
                                                    <p className="font-medium text-charcoal">{line.name}</p>
                                                    <p className="text-xs text-muted">
                                                        {peso(line.price)} × {line.quantity}
                                                    </p>
                                                </div>
                                                <span className="font-medium text-charcoal">
                                                    {peso(line.price * line.quantity)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="-mx-4 -mb-4 mt-4 flex items-center justify-between rounded-b-xl border-t border-border bg-primary-light/10 p-4">
                                    <span className="text-sm font-semibold text-charcoal">
                                        Total Package
                                    </span>
                                    <span className="text-base font-bold text-primary-dark">
                                        {peso(selected.total)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Staff Assignments Section */}
                        <div className="rounded-xl border border-border p-4">
                            <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
                                <div className="flex items-center gap-2">
                                    <FiUsers className="h-4 w-4 text-primary" />
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                                        Assigned Staff Team ({selected.assignments.length})
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => openEdit(selected)}
                                    className="text-xs font-medium text-primary-dark hover:underline"
                                >
                                    Edit assignments
                                </button>
                            </div>

                            {selected.assignments.length === 0 ? (
                                <p className="py-2 text-sm text-muted">No staff assigned yet.</p>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {selected.assignments.map((assignment) => (
                                        <div
                                            key={assignment.id}
                                            className={`rounded-xl border p-3 text-sm ${
                                                assignment.role === "lead"
                                                    ? "border-primary/40 bg-primary-light/10"
                                                    : "border-border bg-charcoal/[0.01]"
                                            }`}
                                        >
                                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                                <span className="font-semibold text-charcoal">
                                                    {assignment.staffName}
                                                </span>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                        assignment.role === "lead"
                                                            ? "bg-primary text-white"
                                                            : "bg-charcoal/[0.06] text-charcoal"
                                                    }`}
                                                >
                                                    {ROLE_OPTIONS.find((r) => r.value === assignment.role)?.label ??
                                                        assignment.role}
                                                </span>
                                            </div>
                                            <div className="space-y-0.5 text-xs text-muted">
                                                <p>Call: {formatDateTime(assignment.callTime)}</p>
                                                <p>Release: {formatDateTime(assignment.releaseTime)}</p>
                                                <p className="text-[11px]">
                                                    {assignment.travelRequired
                                                        ? "🚗 Travel required"
                                                        : "🏠 On-site / No travel"}
                                                    {assignment.commissionSharePercent !== null &&
                                                        ` · ${assignment.commissionSharePercent}% commission`}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Logistics Grid: Itinerary & Event Kit */}
                        <div className="grid gap-5 md:grid-cols-2">
                            {/* Travel Itinerary */}
                            <div className="flex flex-col justify-between rounded-xl border border-border p-4">
                                <div>
                                    <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
                                        <div className="flex items-center gap-2">
                                            <FiTruck className="h-4 w-4 text-primary" />
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                                                Travel Itinerary ({selected.itinerary.length})
                                            </h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openItinerary(selected)}
                                            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium hover:bg-charcoal/5"
                                        >
                                            Manage itinerary
                                        </button>
                                    </div>

                                    {selected.itinerary.length === 0 ? (
                                        <p className="py-4 text-center text-xs text-muted">
                                            No travel segments scheduled. Click "Manage itinerary" to set up departure and arrival routes.
                                        </p>
                                    ) : (
                                        <ol className="space-y-2">
                                            {selected.itinerary.map((segment) => (
                                                <li
                                                    key={segment.id}
                                                    className="rounded-lg border border-border/80 p-2.5 text-xs"
                                                >
                                                    <div className="flex items-center justify-between gap-2 font-medium text-charcoal">
                                                        <span>
                                                            {segment.from} → {segment.to}
                                                        </span>
                                                        <span className="rounded bg-charcoal/[0.05] px-2 py-0.5 text-[11px] capitalize text-muted">
                                                            {MODE_OPTIONS.find((m) => m.value === segment.mode)?.label ??
                                                                segment.mode}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-[11px] text-muted">
                                                        {formatDateTime(segment.departAt)} –{" "}
                                                        {formatDateTime(segment.arriveAt)} ·{" "}
                                                        {segment.staffName ?? "Whole team"}
                                                    </p>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </div>
                            </div>

                            {/* Event Kit & Supplies */}
                            <div className="flex flex-col justify-between rounded-xl border border-border p-4">
                                <div>
                                    <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
                                        <div className="flex items-center gap-2">
                                            <FiPackage className="h-4 w-4 text-primary" />
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                                                Event Kit & Supplies ({selected.supplies.length})
                                            </h3>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => openKit(selected)}
                                                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium hover:bg-charcoal/5"
                                            >
                                                Manage kit
                                            </button>
                                            {selected.supplies.length > 0 && (
                                                <Button
                                                    variant="secondary"
                                                    className="min-h-0 px-2.5 py-1 text-xs"
                                                    onClick={() => void issueKit()}
                                                    loading={busy}
                                                >
                                                    Issue kit
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {selected.supplies.length === 0 ? (
                                        <p className="py-4 text-center text-xs text-muted">
                                            No supplies planned for this event. Click "Manage kit" to reserve supplies and hair/makeup kits.
                                        </p>
                                    ) : (
                                        <ul className="space-y-1.5 text-xs">
                                            {selected.supplies.map((line) => (
                                                <li
                                                    key={line.supplyId}
                                                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-2"
                                                >
                                                    <div>
                                                        <span className="font-medium text-charcoal">
                                                            {line.name}
                                                        </span>
                                                        <span className="block text-[11px] text-muted">
                                                            Planned: {line.plannedQuantity} {line.unit}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                            line.status === "issued"
                                                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                : "bg-slate-100 text-slate-700"
                                                        }`}
                                                    >
                                                        {line.status === "issued"
                                                            ? `Issued (${line.issuedQuantity} ${line.unit})`
                                                            : "Planned"}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {editing && (
                <Modal
                    title={editing === "new" ? "New event" : `Edit ${editing.title}`}
                    onClose={() => setEditing(null)}
                    wide
                    footer={
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setEditing(null)}>
                                Cancel
                            </Button>
                            <Button onClick={() => void saveEvent()} loading={busy}>
                                Save event
                            </Button>
                        </div>
                    }
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        {editing !== "new" && (
                            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-charcoal/[0.02] p-3">
                                <div>
                                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted">
                                        Current Status
                                    </span>
                                    <span
                                        className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                            STATUS_BADGE_CLASSES[editing.status]
                                        }`}
                                    >
                                        {STATUS_LABELS[editing.status]}
                                    </span>
                                </div>
                                {nextStatuses(editing.status).length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted">Update to:</span>
                                        <select
                                            value=""
                                            onChange={async (e) => {
                                                const next = e.target.value as EventStatus;
                                                if (next) {
                                                    try {
                                                        const res = await api.patch<{ data: EventDetail }>(
                                                            `/owner/events/${editing.id}/status`,
                                                            { status: next }
                                                        );
                                                        setEditing(res.data.data);
                                                        await reload();
                                                        toast.success(
                                                            `Event status updated to ${STATUS_LABELS[next]}.`
                                                        );
                                                    } catch {
                                                        // toast via interceptor
                                                    }
                                                }
                                            }}
                                            className="cursor-pointer rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-charcoal outline-none hover:border-primary focus:border-primary"
                                        >
                                            <option value="" disabled>
                                                Select new status…
                                            </option>
                                            {nextStatuses(editing.status).map((st) => (
                                                <option key={st} value={st}>
                                                    {STATUS_LABELS[st]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
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
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium">Services</p>
                            <span className="text-xs text-muted">
                                Check services to include in this event
                            </span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {services
                                .filter(
                                    (s) =>
                                        s.is_active === 1 ||
                                        (serviceQty[s.id] !== undefined &&
                                            Number(serviceQty[s.id]) > 0)
                                )
                                .map((service) => {
                                    const rawQty = serviceQty[service.id];
                                    const isChecked =
                                        rawQty !== undefined &&
                                        rawQty !== "" &&
                                        Number(rawQty) > 0;
                                    return (
                                        <div
                                            key={service.id}
                                            onClick={() => toggleService(service.id)}
                                            className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 transition cursor-pointer select-none ${
                                                isChecked
                                                    ? "border-primary bg-primary-light/15 shadow-xs"
                                                    : "border-border/80 bg-surface hover:border-border hover:bg-charcoal/[0.02]"
                                            }`}
                                        >
                                            <div
                                                className="flex items-center gap-2.5 min-w-0 flex-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input
                                                    type="checkbox"
                                                    id={`service-${service.id}`}
                                                    checked={isChecked}
                                                    onChange={() => toggleService(service.id)}
                                                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 accent-primary cursor-pointer"
                                                />
                                                <label
                                                    htmlFor={`service-${service.id}`}
                                                    className="min-w-0 flex-1 truncate cursor-pointer"
                                                >
                                                    <p
                                                        className={`text-sm truncate ${
                                                            isChecked
                                                                ? "font-medium text-charcoal"
                                                                : "text-charcoal/90"
                                                        }`}
                                                    >
                                                        {service.name}
                                                    </p>
                                                    <p className="text-xs text-muted">
                                                        {peso(service.price)}
                                                    </p>
                                                </label>
                                            </div>

                                            {isChecked && (
                                                <div
                                                    className="flex items-center gap-1.5 shrink-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <span className="text-xs text-muted font-medium">
                                                        Qty:
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={rawQty}
                                                        onChange={(event) =>
                                                            setServiceQty((current) => ({
                                                                ...current,
                                                                [service.id]: event.target.value,
                                                            }))
                                                        }
                                                        onBlur={(event) => {
                                                            const val = Number(event.target.value);
                                                            if (!Number.isFinite(val) || val <= 0) {
                                                                setServiceQty((current) => ({
                                                                    ...current,
                                                                    [service.id]: "1",
                                                                }));
                                                            }
                                                        }}
                                                        className="w-16 rounded-lg border border-primary/50 bg-surface px-2 py-1 text-center text-sm font-semibold text-charcoal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                        aria-label={`Quantity for ${service.name}`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
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
                </Modal>
            )}

            {venueOpen && (
                <Modal
                    title="Venues"
                    onClose={() => setVenueOpen(false)}
                    footer={
                        <div className="flex justify-end">
                            <Button onClick={() => void createVenue()}>Add venue</Button>
                        </div>
                    }
                >
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
                </Modal>
            )}

            {itineraryOpen && selected && (
                <Modal
                    title={`Travel itinerary — ${selected.title}`}
                    onClose={() => setItineraryOpen(false)}
                    footer={
                        <div className="flex w-full items-center justify-between">
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
                                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-charcoal/5"
                            >
                                Add segment
                            </button>
                            <Button onClick={() => void saveItinerary()} loading={busy}>
                                Save itinerary
                            </Button>
                        </div>
                    }
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
                </Modal>
            )}

            {kitOpen && selected && (
                <Modal
                    title={`Event kit — ${selected.title}`}
                    onClose={() => setKitOpen(false)}
                    footer={
                        <div className="flex justify-end gap-2">
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
                    }
                >
                    <p className="mb-3 text-sm text-muted">
                        Planned quantities are reserved when you issue the kit. Issuing
                        deducts stock immediately.
                    </p>
                    <div className="space-y-2">
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
                </Modal>
            )}
        </div>
    );
}
