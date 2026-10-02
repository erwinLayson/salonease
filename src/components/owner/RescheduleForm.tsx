import { useState } from "react";
import { api } from "../../lib/api";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Field } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";

import type { AppointmentDetail, OwnerStaff } from "../../types";
import { SlotGrid } from "./SlotGrid";
import { dateInDays } from "../../lib/utils";

interface RescheduleFormProps {
    appointment: AppointmentDetail;
    staff: OwnerStaff[];
    onClose: () => void;
    onDone: (message: string) => void | Promise<void>;
}

export function RescheduleForm(props: RescheduleFormProps) {
    const [date, setDate] = useState(dateInDays(0));
    const [staffId, setStaffId] = useState(String(props.appointment.staff.id));
    const [slot, setSlot] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const submit = async (): Promise<boolean> => {
        if (!slot) {
            return false;
        }
        setBusy(true);
        try {
            await api.post(`/owner/appointments/${props.appointment.id}/reschedule`, {
                startAt: `${date}T${slot}:00`,
                staffId: Number(staffId),
            });
            await props.onDone(`${props.appointment.reference} rescheduled to ${date} ${slot}.`);
            return true;
        } catch {
            // Failures surface as a toast via the axios error interceptor.
            return false;
        } finally {
            setBusy(false);
        }
    };

    const selectedStaff = props.staff.find((member) => member.id === Number(staffId));
    const staffLabel = selectedStaff
        ? `${selectedStaff.first_name} ${selectedStaff.last_name}`
        : "the selected staff";

    return (
        <>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="New date" value={date} onChange={setDate} type="date" />
                <Select
                    label="Staff"
                    value={staffId}
                    onChange={setStaffId}
                    options={props.staff.map((member) => ({
                        value: String(member.id),
                        label: `${member.first_name} ${member.last_name}`,
                    }))}
                />
            </div>

            <div className="mt-4">
                <SlotGrid
                    serviceId={props.appointment.service.id}
                    staffId={Number(staffId)}
                    date={date}
                    selected={slot}
                    onSelect={setSlot}
                />
            </div>

            <div className="mt-4 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={props.onClose}
                    className="rounded-md border border-border min-h-11 px-4 py-2 text-sm"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={busy || !slot}
                    onClick={() => setConfirming(true)}
                    className="rounded-md bg-primary-dark min-h-11 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                    Reschedule
                </button>
            </div>

            {confirming && slot !== null && (
                <ConfirmDialog
                    title="Confirm reschedule"
                    confirmLabel="Reschedule"
                    tone="brand"
                    busy={busy}
                    busyLabel="Rescheduling…"
                    onConfirm={() => {
                        void (async () => {
                            if (await submit()) {
                                setConfirming(false);
                            }
                        })();
                    }}
                    onCancel={() => setConfirming(false)}
                    message={
                        <>
                            <p>
                                Move{" "}
                                <strong>{props.appointment.reference}</strong> to{" "}
                                <strong>
                                    {date} at {slot}
                                </strong>{" "}
                                with <strong>{staffLabel}</strong>?
                            </p>
                            <p className="mt-2 text-xs text-muted">
                                The appointment moves to the new time — the customer's
                                manage link keeps working.
                            </p>
                        </>
                    }
                />
            )}
        </>
    );
}
