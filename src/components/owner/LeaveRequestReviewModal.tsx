import { useEffect, useState } from "react";
import axios from "axios";
import { api, errorMessage } from "../../lib/api";
import { toast } from "../../lib/toast";

// UI components
import { Field } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { StatusBadge } from "../ui/StatusBadge";

// Types
import type { AppointmentDetail, LeaveRequest } from "../../types";
import { formatDateTime } from "../../lib/utils";

/** `2026-10-03` -> `Oct 3, 2026`. */
const formatDay = (key: string): string =>
    new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

/**
 * Reviews one pending leave request: lists the appointments that fall in
 * the requested period (they are never touched automatically) and requires
 * an explicit confirmation before approving over them. Rejection takes an
 * optional reason.
 */
export function LeaveRequestReviewModal(props: {
    request: LeaveRequest;
    onClose: () => void;
    /** A decision was made — parent reloads its list. */
    onDecided: () => void;
}) {
    const [step, setStep] = useState<"review" | "reject">("review");
    const [conflicts, setConflicts] = useState<AppointmentDetail[]>([]);
    const [checking, setChecking] = useState(true);
    const [reviewed, setReviewed] = useState(false);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let stale = false;
        const load = async () => {
            setChecking(true);
            try {
                const res = await api.get<{ data: AppointmentDetail[] }>(
                    `/owner/leave-requests/${props.request.id}/conflicts`
                );
                if (!stale) {
                    setConflicts(res.data.data);
                }
            } catch {
                if (!stale) {
                    setError("Could not check the appointments in this period.");
                }
            } finally {
                if (!stale) {
                    setChecking(false);
                }
            }
        };
        void load();
        return () => {
            stale = true;
        };
    }, [props.request.id]);

    const approve = async (): Promise<void> => {
        setBusy(true);
        setError(null);
        try {
            await api.post(
                `/owner/leave-requests/${props.request.id}/approve`,
                conflicts.length > 0 ? { force: true } : {},
                { skipErrorToast: true }
            );
            toast.success("Leave approved — those dates are now blocked.");
            props.onDecided();
            props.onClose();
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 409) {
                // New bookings appeared while reviewing — show them again.
                const data = err.response.data as {
                    conflicts?: AppointmentDetail[];
                    message?: string;
                };
                setConflicts(data.conflicts ?? []);
                setReviewed(false);
                setError(
                    data.message ??
                        "New appointments overlap these dates — review the updated list."
                );
            } else {
                toast.error(errorMessage(err));
            }
        } finally {
            setBusy(false);
        }
    };

    const reject = async (): Promise<void> => {
        setBusy(true);
        setError(null);
        const trimmed = reason.trim();
        try {
            await api.post(
                `/owner/leave-requests/${props.request.id}/reject`,
                trimmed ? { reason: trimmed } : {},
                { skipErrorToast: true }
            );
            toast.success("Leave request rejected.");
            props.onDecided();
            props.onClose();
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const count = conflicts.length;
    const canApprove = !checking && (count === 0 || reviewed);

    return (
        <Modal
            title={
                step === "review"
                    ? `Review leave — ${props.request.staffName}`
                    : `Reject request — ${props.request.staffName}`
            }
            onClose={props.onClose}
            wide
        >
            {step === "review" ? (
                <div>
                    <dl className="grid gap-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                                Dates
                            </dt>
                            <dd className="mt-0.5">
                                {formatDay(props.request.startDate)} –{" "}
                                {formatDay(props.request.endDate)}
                                <span className="text-muted">
                                    {" "}
                                    · {props.request.days} day
                                    {props.request.days === 1 ? "" : "s"}
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                                Requested
                            </dt>
                            <dd className="mt-0.5">
                                {formatDateTime(props.request.requestedAt)}
                            </dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                                Reason
                            </dt>
                            <dd className="mt-0.5">
                                {props.request.reason || "No reason given"}
                            </dd>
                        </div>
                    </dl>

                    <div className="mt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted">
                            Affected appointments
                        </p>

                        {checking ? (
                            <p className="mt-2 text-sm text-muted">
                                Checking the appointments in this period…
                            </p>
                        ) : count === 0 ? (
                            <p className="mt-2 rounded-lg border border-success-line bg-success-bg p-3 text-sm text-success">
                                No appointments are affected — approving only blocks
                                these dates.
                            </p>
                        ) : (
                            <>
                                <div className="mt-2 rounded-lg border border-warning-line bg-warning-bg p-4 text-sm">
                                    <p className="font-medium text-warning">
                                        {count} appointment{count === 1 ? "" : "s"} fall
                                        {count === 1 ? "s" : ""} in this period
                                    </p>
                                    <p className="mt-1 text-charcoal">
                                        They are not cancelled or moved by approving —
                                        review {count === 1 ? "it" : "them"} before you
                                        approve.
                                    </p>
                                </div>

                                <ul className="mt-3 grid gap-2">
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
                                                {appointment.customer.name} ·{" "}
                                                {appointment.service.name} ·{" "}
                                                {appointment.staff.name}
                                            </p>
                                        </li>
                                    ))}
                                </ul>

                                <label className="mt-3 flex min-h-11 items-start gap-2 rounded-lg border border-border p-3 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={reviewed}
                                        onChange={(event) =>
                                            setReviewed(event.target.checked)
                                        }
                                        className="mt-0.5 h-4 w-4 accent-primary"
                                    />
                                    <span>
                                        I have reviewed the {count} affected appointment
                                        {count === 1 ? "" : "s"} above.
                                    </span>
                                </label>
                            </>
                        )}
                    </div>

                    {error && (
                        <p
                            aria-live="polite"
                            className="mt-3 flex items-start gap-1.5 text-sm font-medium text-danger"
                        >
                            <span aria-hidden className="mt-0.5">
                                !
                            </span>
                            {error}
                        </p>
                    )}

                    <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={props.onClose}
                            className="min-h-11 rounded-lg border border-border px-4 text-sm transition-colors hover:bg-charcoal/5 disabled:opacity-40"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => setStep("reject")}
                            className="min-h-11 rounded-lg border border-danger-line px-4 text-sm font-medium text-danger transition-colors hover:bg-danger-bg disabled:opacity-40"
                        >
                            Reject
                        </button>
                        <button
                            type="button"
                            disabled={busy || !canApprove}
                            aria-busy={busy}
                            onClick={() => void approve()}
                            className="min-h-11 rounded-lg bg-primary-dark px-4 text-sm font-medium text-white transition-colors hover:bg-primary-press disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {busy
                                ? "Approving…"
                                : count > 0
                                  ? `Approve anyway (${count})`
                                  : "Approve leave"}
                        </button>
                    </div>
                </div>
            ) : (
                <div>
                    <p className="text-sm leading-relaxed text-charcoal">
                        Reject the request from <strong>{props.request.staffName}</strong>{" "}
                        for {formatDay(props.request.startDate)} –{" "}
                        {formatDay(props.request.endDate)}? An optional reason is shared
                        with them.
                    </p>

                    <div className="mt-3">
                        <Field
                            label="Reason (optional)"
                            value={reason}
                            onChange={setReason}
                            placeholder="e.g. Too many staff off that week"
                        />
                    </div>

                    <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => setStep("review")}
                            className="min-h-11 rounded-lg border border-border px-4 text-sm transition-colors hover:bg-charcoal/5 disabled:opacity-40"
                        >
                            ← Back
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            aria-busy={busy}
                            onClick={() => void reject()}
                            className="min-h-11 rounded-lg bg-danger px-4 text-sm font-medium text-white transition-colors hover:bg-danger/90 disabled:opacity-40"
                        >
                            {busy ? "Rejecting…" : "Reject request"}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
