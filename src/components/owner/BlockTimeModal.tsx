import { useState } from "react";
import axios from "axios";
import { api, errorMessage } from "../../lib/api";
import { toast } from "../../lib/toast";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Field } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { StatusBadge } from "../ui/StatusBadge";
import { RescheduleForm } from "./RescheduleForm";

import type { AppointmentDetail, OwnerStaff } from "../../types";
import { formatDateTime } from "../../lib/utils";

interface BlockTimeModalProps {
    /** Pre-selected staff for a leave; null starts on a whole-salon closure. */
    staffId: number | null;
    staffName?: string;
    date: string;
    staff: OwnerStaff[];
    /** Show the staff picker so the owner can choose who the block applies to. */
    allowStaffSelect?: boolean;
    onClose: () => void;
    /** An appointment was cancelled/rescheduled while resolving conflicts. */
    onChanged: () => void | Promise<void>;
    /** The exception was created — parent toasts and reloads the schedule. */
    onCreated: () => void;
}

/**
 * Creates a leave/closure block for one staff member's day. If active
 * appointments overlap the block, switches to a conflict step that lists
 * them with reschedule/cancel actions — or "Block anyway" (force).
 */
export function BlockTimeModal(props: BlockTimeModalProps) {
    const selectMode = props.allowStaffSelect === true;
    const [step, setStep] = useState<"form" | "conflicts">("form");
    const [blockType, setBlockType] = useState<"leave" | "closure">("leave");
    // Staff picker value; "" means a whole-salon closure.
    const [target, setTarget] = useState<string>(
        props.staffId != null ? String(props.staffId) : ""
    );
    const [date, setDate] = useState(props.date);
    const [fullDay, setFullDay] = useState(true);
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [reason, setReason] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [conflicts, setConflicts] = useState<AppointmentDetail[]>([]);
    const [rescheduleFor, setRescheduleFor] = useState<AppointmentDetail | null>(null);
    const [cancelFor, setCancelFor] = useState<AppointmentDetail | null>(null);
    const [cancelBusy, setCancelBusy] = useState(false);

    const startAt = `${date}T${fullDay ? "00:00" : startTime}:00`;
    const endAt = `${date}T${fullDay ? "23:59" : endTime}:00`;

    // In select mode the chosen staff member determines leave vs closure.
    const effectiveType: "leave" | "closure" = selectMode
        ? target === ""
            ? "closure"
            : "leave"
        : blockType;
    const effectiveStaffId: number | null = selectMode
        ? target === ""
            ? null
            : Number(target)
        : props.staffId;

    /** POSTs the exception; a 409 moves to the conflict step. */
    const submit = async (force: boolean): Promise<boolean> => {
        setFormError(null);
        if (!fullDay && endTime <= startTime) {
            setFormError("End time must be after the start time.");
            return false;
        }

        setBusy(true);
        try {
            await api.post(
                "/owner/schedule-exceptions",
                {
                    ...(effectiveType === "leave" ? { staffId: effectiveStaffId } : {}),
                    type: effectiveType,
                    startAt,
                    endAt,
                    reason: reason.trim() || null,
                    ...(force ? { force: true } : {}),
                },
                { skipErrorToast: true }
            );
            props.onCreated();
            props.onClose();
            return true;
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 409) {
                const data = err.response.data as { conflicts?: AppointmentDetail[] };
                setConflicts(data.conflicts ?? []);
                setStep("conflicts");
                return false;
            }
            toast.error(errorMessage(err));
            return false;
        } finally {
            setBusy(false);
        }
    };

    /** After resolving one conflicting appointment, re-run the check. */
    const retryAfterResolve = async (): Promise<void> => {
        await props.onChanged();
        await submit(false);
    };

    const cancelAppointment = async (appointment: AppointmentDetail): Promise<void> => {
        setCancelBusy(true);
        try {
            await api.patch(`/owner/appointments/${appointment.id}/status`, {
                status: "cancelled",
            });
            toast.success(`${appointment.reference} cancelled.`);
            setCancelFor(null);
            await retryAfterResolve();
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setCancelBusy(false);
        }
    };

    const title = rescheduleFor
        ? `Reschedule ${rescheduleFor.reference}`
        : step === "conflicts"
          ? "Resolve conflicts"
          : "Block time / add leave";

    return (
        <Modal title={title} onClose={props.onClose} wide>
            {rescheduleFor ? (
                <RescheduleForm
                    appointment={rescheduleFor}
                    staff={props.staff}
                    onClose={() => setRescheduleFor(null)}
                    onDone={async (message) => {
                        setRescheduleFor(null);
                        toast.success(message);
                        await retryAfterResolve();
                    }}
                />
            ) : step === "form" ? (
                <div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {selectMode ? (
                            <Select
                                label="Applies to"
                                value={target}
                                onChange={setTarget}
                                options={[
                                    { value: "", label: "Whole salon (closure)" },
                                    ...props.staff.map((member) => ({
                                        value: String(member.id),
                                        label: `${member.first_name} ${member.last_name} — leave`,
                                    })),
                                ]}
                            />
                        ) : (
                            <Select
                                label="Block type"
                                value={blockType}
                                onChange={(value) =>
                                    setBlockType(value as "leave" | "closure")
                                }
                                options={[
                                    {
                                        value: "leave",
                                        label: `Leave — ${props.staffName ?? "staff"}`,
                                    },
                                    { value: "closure", label: "Closure — whole salon" },
                                ]}
                            />
                        )}
                        <Field label="Date" value={date} onChange={setDate} type="date" />
                    </div>

                    <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={fullDay}
                            onChange={(event) => setFullDay(event.target.checked)}
                            className="h-4 w-4 accent-primary"
                        />
                        Full day
                    </label>

                    {!fullDay && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field
                                label="From"
                                value={startTime}
                                onChange={setStartTime}
                                type="time"
                            />
                            <Field label="Until" value={endTime} onChange={setEndTime} type="time" />
                        </div>
                    )}

                    <div className="mt-3">
                        <Field
                            label="Reason (optional)"
                            value={reason}
                            onChange={setReason}
                            placeholder="e.g. Training, family matter, holiday"
                        />
                    </div>

                    {effectiveType === "closure" && (
                        <p className="mt-2 text-xs text-muted">
                            A closure blocks every staff member for the selected time.
                        </p>
                    )}

                    {formError && (
                        <p
                            aria-live="polite"
                            className="mt-3 flex items-start gap-1.5 text-sm font-medium text-danger"
                        >
                            <span aria-hidden className="mt-0.5">
                                !
                            </span>
                            {formError}
                        </p>
                    )}

                    <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
                        <button
                            type="button"
                            onClick={props.onClose}
                            className="min-h-11 rounded-lg border border-border px-4 text-sm transition-colors hover:bg-charcoal/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            aria-busy={busy}
                            onClick={() => void submit(false)}
                            className="min-h-11 rounded-lg bg-primary-dark px-4 text-sm font-medium text-white transition-colors hover:bg-primary-press disabled:opacity-40"
                        >
                            {busy ? "Checking…" : "Block time"}
                        </button>
                    </div>
                </div>
            ) : (
                <div>
                    <div className="rounded-lg border border-warning-line bg-warning-bg p-4 text-sm">
                        <p className="font-medium text-warning">
                            {conflicts.length} active appointment
                            {conflicts.length === 1 ? "" : "s"} overlap this time
                        </p>
                        <p className="mt-1 text-charcoal">
                            Reschedule or cancel {conflicts.length === 1 ? "it" : "them"} first,
                            or block anyway to leave {conflicts.length === 1 ? "it" : "them"} as
                            is.
                        </p>
                    </div>

                    <ul className="mt-4 grid gap-2">
                        {conflicts.map((appointment) => (
                            <li
                                key={appointment.id}
                                className="rounded-lg border border-border p-3 text-sm"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium">
                                        {formatDateTime(appointment.startAt)}
                                    </span>
                                    <StatusBadge status={appointment.status} />
                                    <span className="text-xs text-muted">
                                        {appointment.reference}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-charcoal">
                                    {appointment.customer.name} · {appointment.service.name} ·{" "}
                                    {appointment.staff.name}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRescheduleFor(appointment)}
                                        className="min-h-11 rounded-lg border border-border px-3 text-xs font-medium transition-colors hover:bg-charcoal/5"
                                    >
                                        Reschedule
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCancelFor(appointment)}
                                        className="min-h-11 rounded-lg border border-danger-line px-3 text-xs font-medium text-danger transition-colors hover:bg-danger-bg"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setConflicts([]);
                                setStep("form");
                            }}
                            className="min-h-11 rounded-lg border border-border px-4 text-sm transition-colors hover:bg-charcoal/5"
                        >
                            ← Back
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            aria-busy={busy}
                            onClick={() => void submit(true)}
                            className="min-h-11 rounded-lg bg-primary-dark px-4 text-sm font-medium text-white transition-colors hover:bg-primary-press disabled:opacity-40"
                        >
                            {busy ? "Blocking…" : "Block anyway"}
                        </button>
                    </div>
                </div>
            )}

            {cancelFor && (
                <ConfirmDialog
                    title="Cancel appointment?"
                    message={
                        <>
                            <p>
                                This cancels the appointment so the block can cover that time.
                                The customer should be notified.
                            </p>
                            <p className="mt-2 font-medium">
                                {cancelFor.reference} · {formatDateTime(cancelFor.startAt)}
                            </p>
                        </>
                    }
                    confirmLabel="Cancel appointment"
                    busy={cancelBusy}
                    busyLabel="Cancelling…"
                    onConfirm={() => void cancelAppointment(cancelFor)}
                    onCancel={() => setCancelFor(null)}
                />
            )}
        </Modal>
    );
}
