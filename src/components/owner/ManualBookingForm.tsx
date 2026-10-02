import { useState } from "react";
import { api } from "../../lib/api";
import { Field } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";

import type { AppointmentDetail, OwnerService, OwnerStaff } from "../../types";
import { SlotGrid } from "./SlotGrid";
import { dateInDays } from "../../lib/utils";

interface ManualBookingFormProps {
    services: OwnerService[];
    staff: OwnerStaff[];
    onDone: (message: string) => void | Promise<void>;
}

export function ManualBookingForm(props: ManualBookingFormProps) {
    const [serviceId, setServiceId] = useState(
        props.services[0] ? String(props.services[0].id) : ""
    );
    const [staffId, setStaffId] = useState(props.staff[0] ? String(props.staff[0].id) : "");
    const [date, setDate] = useState(dateInDays(0));
    const [slot, setSlot] = useState<string | null>(null);
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        notes: "",
    });
    const [busy, setBusy] = useState(false);

    if (props.services.length === 0 || props.staff.length === 0) {
        return (
            <p className="text-sm text-muted">
                Add an active service and an active staff member first.
            </p>
        );
    }

    const submit = async () => {
        setBusy(true);
        try {
            const res = await api.post<{ data: AppointmentDetail }>("/owner/appointments", {
                serviceId: Number(serviceId),
                staffId: Number(staffId),
                startAt: `${date}T${slot}:00`,
                firstName: form.firstName,
                lastName: form.lastName || null,
                phone: form.phone || null,
                email: form.email || null,
                notes: form.notes || null,
            });
            await props.onDone(`Booking ${res.data.data.reference} created.`);
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div className="grid gap-3 sm:grid-cols-3">
                <Select
                    label="Service"
                    value={serviceId}
                    onChange={(value) => {
                        setServiceId(value);
                        setSlot(null);
                    }}
                    options={props.services.map((service) => ({
                        value: String(service.id),
                        label: `${service.name} (${service.duration_minutes} min)`,
                    }))}
                />
                <Select
                    label="Staff"
                    value={staffId}
                    onChange={(value) => {
                        setStaffId(value);
                        setSlot(null);
                    }}
                    options={props.staff.map((member) => ({
                        value: String(member.id),
                        label: `${member.first_name} ${member.last_name}`,
                    }))}
                />
                <Field
                    label="Date"
                    value={date}
                    onChange={(value) => {
                        setDate(value);
                        setSlot(null);
                    }}
                    type="date"
                />
            </div>

            <p className="mt-2 text-xs text-muted">
                Tip: the owner may book outside normal hours by choosing a time manually; the
                slot grid below only shows regular availability.
            </p>

            <div className="mt-3">
                <SlotGrid
                    serviceId={Number(serviceId)}
                    staffId={Number(staffId)}
                    date={date}
                    selected={slot}
                    onSelect={setSlot}
                />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field
                    label="First name *"
                    value={form.firstName}
                    onChange={(value) => setForm({ ...form, firstName: value })}
                />
                <Field
                    label="Last name"
                    value={form.lastName}
                    onChange={(value) => setForm({ ...form, lastName: value })}
                />
                <Field
                    label="Phone"
                    value={form.phone}
                    onChange={(value) => setForm({ ...form, phone: value })}
                />
                <Field
                    label="Email"
                    value={form.email}
                    onChange={(value) => setForm({ ...form, email: value })}
                />
            </div>

            <label className="mt-3 block text-sm">
                <span className="mb-1 block opacity-70">Notes</span>
                <textarea
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    rows={2}
                    className="w-full rounded-md border border-border bg-transparent px-3 py-2"
                />
            </label>

            <div className="mt-4 flex justify-end">
                <button
                    type="button"
                    disabled={busy || !slot || !form.firstName || (!form.phone && !form.email)} aria-busy={busy} 
                    onClick={() => void submit()}
                    className="rounded-md bg-primary-dark min-h-11 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                    {busy ? "Saving…" : "Create booking"}
                </button>
            </div>
        </>
    );
}
