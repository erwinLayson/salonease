import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../../lib/api";
import { toast } from "../../lib/toast";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Drawer } from "../ui/Drawer";
import { Modal } from "../ui/Modal";
import { StatusAction } from "./StatusAction";
import { StatusBadge } from "../ui/StatusBadge";
import { RescheduleForm } from "./RescheduleForm";
import { PaymentControls } from "../PaymentControls";

import type { AppointmentDetail, AppointmentStatus, OwnerStaff } from "../../types";
import { formatClock, formatDateTime, peso } from "../../lib/utils";

const TERMINAL: AppointmentStatus[] = ["completed", "cancelled", "no_show"];

/**
 * Right-side detail panel for one appointment: customer/contact info plus
 * the same status actions as the Appointments page (confirm, complete,
 * cancel, no-show, reschedule).
 */
export function AppointmentDrawer(props: {
    appointmentId: number;
    staff: OwnerStaff[];
    /** Owner sees every action; staff only confirm/complete and take payment. */
    scope?: "owner" | "staff";
    onClose: () => void;
    /** Schedule data changed — parent reloads the view. */
    onChanged: () => void | Promise<void>;
}) {
    const scope = props.scope ?? "owner";
    /** API prefix for the caller's role — staff endpoints 404 foreign rows. */
    const base = scope === "staff" ? "/staff" : "/owner";
    const [detail, setDetail] = useState<AppointmentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [rescheduleFor, setRescheduleFor] = useState<AppointmentDetail | null>(null);
    const [confirmFor, setConfirmFor] = useState<AppointmentStatus | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await api.get<{ data: AppointmentDetail }>(
                `${base}/appointments/${props.appointmentId}`
            );
            setDetail(res.data.data);
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setLoading(false);
        }
    }, [base, props.appointmentId]);

    useEffect(() => {
        // Defer to a microtask so the effect body stays synchronous-free.
        void Promise.resolve().then(load);
    }, [load]);

    const changeStatus = async (next: AppointmentStatus): Promise<boolean> => {
        if (!detail) {
            return false;
        }
        setBusy(true);
        try {
            await api.patch(`${base}/appointments/${detail.id}/status`, {
                status: next,
            });
            toast.success(`${detail.reference} marked as ${next.replace(/_/g, " ")}.`);
            await props.onChanged();
            await load();
            return true;
        } catch {
            return false;
        } finally {
            setBusy(false);
        }
    };

    const row = (label: string, value: ReactNode) => (
        <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-xs font-medium uppercase tracking-wide text-muted">
                {label}
            </dt>
            <dd className="min-w-0 flex-1 text-sm text-charcoal">{value}</dd>
        </div>
    );

    const isActive =
        detail !== null && !TERMINAL.includes(detail.status);

    return (
        <Drawer
            title={detail ? detail.reference : "Appointment"}
            onClose={props.onClose}
        >
            {loading && <p className="text-sm text-muted">Loading…</p>}

            {!loading && !detail && (
                <p className="text-sm text-muted">
                    Could not load this appointment. Close the panel and try again.
                </p>
            )}

            {!loading && detail && (
                <div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={detail.status} />
                        <span className="text-xs text-muted">
                            {detail.source === "manual" ? "Walk-in / phone" : "Online booking"}
                        </span>
                    </div>

                    <dl className="mt-4 grid gap-2.5">
                        {row("Customer", detail.customer.name)}
                        {row(
                            "Phone",
                            detail.customer.phone ? (
                                <a
                                    href={`tel:${detail.customer.phone}`}
                                    className="text-primary-dark underline decoration-border transition-colors hover:text-primary-press"
                                >
                                    {detail.customer.phone}
                                </a>
                            ) : (
                                <span className="text-muted">—</span>
                            )
                        )}
                        {row(
                            "Email",
                            detail.customer.email ? (
                                <a
                                    href={`mailto:${detail.customer.email}`}
                                    className="text-primary-dark underline decoration-border transition-colors hover:text-primary-press"
                                >
                                    {detail.customer.email}
                                </a>
                            ) : (
                                <span className="text-muted">—</span>
                            )
                        )}
                        {row(
                            "Service",
                            `${detail.service.name} · ${detail.service.durationMinutes} min`
                        )}
                        {row("Staff", detail.staff.name)}
                        {row(
                            "When",
                            `${formatDateTime(detail.startAt)} – ${formatClock(detail.endAt)}`
                        )}
                        {row("Price", peso(detail.price))}
                        {detail.notes &&
                            row(
                                "Notes",
                                <span className="whitespace-pre-wrap">{detail.notes}</span>
                            )}
                    </dl>

                    <div className="mt-5 border-t border-border pt-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                            Actions
                        </p>
                        {isActive ? (
                            <div className="flex flex-wrap gap-2">
                                {detail.status === "pending" && (
                                    <StatusAction
                                        label="Confirm"
                                        disabled={busy}
                                        onClick={() => void changeStatus("confirmed")}
                                    />
                                )}
                                {detail.status === "confirmed" && (
                                    <StatusAction
                                        label="Complete"
                                        disabled={busy}
                                        onClick={() => void changeStatus("completed")}
                                    />
                                )}
                                {scope === "owner" && (
                                    <>
                                        <StatusAction
                                            label="Reschedule"
                                            disabled={busy}
                                            onClick={() => setRescheduleFor(detail)}
                                        />
                                        <StatusAction
                                            label="Cancel"
                                            disabled={busy}
                                            onClick={() => setConfirmFor("cancelled")}
                                        />
                                        <StatusAction
                                            label="No-show"
                                            disabled={busy}
                                            onClick={() => setConfirmFor("no_show")}
                                        />
                                    </>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted">
                                This appointment is already{" "}
                                {detail.status.replace(/_/g, " ")}.
                            </p>
                        )}

                        {/* Completed: staff record how the customer paid. */}
                        {detail.status === "completed" && (
                            <div className="mt-4">
                                <PaymentControls appointmentId={detail.id} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {confirmFor && detail && (
                <ConfirmDialog
                    title={
                        confirmFor === "cancelled"
                            ? "Cancel appointment?"
                            : "Mark as no-show?"
                    }
                    message={
                        <>
                            <p>
                                {confirmFor === "cancelled"
                                    ? "The customer should be notified that this appointment is cancelled."
                                    : "Mark this appointment as a no-show? This cannot be undone."}
                            </p>
                            <p className="mt-2 font-medium">
                                {detail.reference} · {formatDateTime(detail.startAt)}
                            </p>
                        </>
                    }
                    confirmLabel={
                        confirmFor === "cancelled" ? "Cancel appointment" : "Mark no-show"
                    }
                    busy={busy}
                    busyLabel="Saving…"
                    onConfirm={() => {
                        const next = confirmFor;
                        void (async () => {
                            if (await changeStatus(next)) {
                                setConfirmFor(null);
                            }
                        })();
                    }}
                    onCancel={() => setConfirmFor(null)}
                />
            )}

            {rescheduleFor && (
                <Modal
                    title={`Reschedule ${rescheduleFor.reference}`}
                    onClose={() => setRescheduleFor(null)}
                    wide
                >
                    <RescheduleForm
                        appointment={rescheduleFor}
                        staff={props.staff}
                        onClose={() => setRescheduleFor(null)}
                        onDone={async (message) => {
                            setRescheduleFor(null);
                            toast.success(message);
                            await props.onChanged();
                            await load();
                        }}
                    />
                </Modal>
            )}
        </Drawer>
    );
}
