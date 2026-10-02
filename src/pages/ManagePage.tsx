import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "../lib/toast";

// Types
import type { AppointmentView } from "../types";

// UI components
import { Card } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Row } from "../components/ui/Row";
import { ErrorBanner } from "../components/ui/ErrorBanner";

// Utilities
import { peso } from "../lib/utils";

export default function ManagePage() {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";

    const [booking, setBooking] = useState<AppointmentView | null>(null);
    const [loading, setLoading] = useState(Boolean(token));
    // Client-side check only: a link without a token can never load.
    const [error] = useState<string | null>(
        token ? null : "This manage link is missing its token."
    );
    const [preferred, setPreferred] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [confirmReschedule, setConfirmReschedule] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get<{ data: AppointmentView }>(`/public/bookings/${token}`);
            setBooking(res.data.data);
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Defer to a microtask so the effect body stays synchronous-free.
        if (token) void Promise.resolve().then(load);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const cancel = async (): Promise<boolean> => {
        setBusy(true);
        try {
            const res = await api.post<{ data: AppointmentView }>(
                `/public/bookings/${token}/cancel`
            );
            setBooking(res.data.data);
            toast.success("Your appointment has been cancelled.");
            return true;
        } catch {
            // Failures surface as a toast via the axios error interceptor.
            return false;
        } finally {
            setBusy(false);
        }
    };

    const requestReschedule = async (): Promise<boolean> => {
        setBusy(true);
        try {
            const res = await api.post<{ data: { message: string } }>(
                `/public/bookings/${token}/reschedule-request`,
                {
                    preferredStartAt: preferred || null,
                    note: note || null,
                }
            );
            toast.success(res.data.data.message);
            setPreferred("");
            setNote("");
            return true;
        } catch {
            // Failures surface as a toast via the axios error interceptor.
            return false;
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl px-4 py-10">
            <header className="mb-8 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">Manage your booking</h1>
                <p className="mt-2 text-sm opacity-70">Raheem Make Up Studio and Salon</p>
            </header>

            <ErrorBanner message={error} />

            <Card>
                {loading && <p className="text-sm opacity-70">Loading…</p>}

                {booking && (
                    <>
                        <dl className="space-y-1 text-sm">
                            <Row label="Reference" value={booking.reference} />
                            <Row label="Status" value={booking.status} />
                            <Row label="Service" value={booking.serviceName} />
                            <Row label="Staff" value={booking.staffName} />
                            <Row label="When" value={new Date(booking.startAt).toLocaleString()} />
                            <Row label="Name" value={booking.customerName} />
                            <Row label="Total" value={peso(booking.price)} />
                        </dl>

                        {booking.canCancel && (
                            <button
                                type="button"
                                disabled={busy}
                                aria-busy={busy}
                                onClick={() => setConfirmCancel(true)}
                                className="mt-6 rounded-lg border border-danger-line min-h-11 px-4 py-2 text-sm text-danger transition-colors hover:bg-danger-bg disabled:opacity-40"
                            >
                                Cancel this appointment
                            </button>
                        )}

                        {booking.canReschedule && (
                            <div className="mt-8 border-t border-border pt-6">
                                <h2 className="text-sm font-medium">Request a different time</h2>
                                <p className="mt-1 text-xs opacity-70">
                                    The salon will contact you to confirm a new time.
                                </p>

                                <label className="mt-3 block text-sm">
                                    <span className="mb-1.5 block font-medium text-charcoal">
                                        Preferred new time
                                    </span>
                                    <input
                                        type="datetime-local"
                                        value={preferred}
                                        onChange={(event) => setPreferred(event.target.value)}
                                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                                    />
                                </label>

                                <label className="mt-3 block text-sm">
                                    <span className="mb-1.5 block font-medium text-charcoal">
                                        Note (optional)
                                    </span>
                                    <input
                                        value={note}
                                        onChange={(event) => setNote(event.target.value)}
                                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/40"
                                    />
                                </label>

                                <button
                                    type="button"
                                    disabled={busy}
                                    aria-busy={busy}
                                    onClick={() => setConfirmReschedule(true)}
                                    className="mt-4 rounded-lg bg-primary-dark min-h-11 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-press disabled:opacity-40"
                                >
                                    Send reschedule request
                                </button>
                            </div>
                        )}

                        {confirmCancel && (
                            <ConfirmDialog
                                title="Cancel your appointment?"
                                confirmLabel="Yes, cancel it"
                                cancelLabel="Keep appointment"
                                busy={busy}
                                busyLabel="Cancelling…"
                                onConfirm={() => {
                                    void (async () => {
                                        if (await cancel()) {
                                            setConfirmCancel(false);
                                        }
                                    })();
                                }}
                                onCancel={() => setConfirmCancel(false)}
                                message={
                                    <>
                                        <p>
                                            Cancel{" "}
                                            <strong>{booking.reference}</strong> —{" "}
                                            {booking.serviceName} with{" "}
                                            {booking.staffName} on{" "}
                                            {new Date(
                                                booking.startAt
                                            ).toLocaleString()}
                                            ? Your slot will be released and this
                                            can't be undone — you'd need to book a
                                            new appointment.
                                        </p>
                                    </>
                                }
                            />
                        )}

                        {confirmReschedule && (
                            <ConfirmDialog
                                title="Request a different time?"
                                confirmLabel="Send request"
                                tone="brand"
                                busy={busy}
                                busyLabel="Sending…"
                                onConfirm={() => {
                                    void (async () => {
                                        if (await requestReschedule()) {
                                            setConfirmReschedule(false);
                                        }
                                    })();
                                }}
                                onCancel={() => setConfirmReschedule(false)}
                                message={
                                    <>
                                        <p>
                                            Send a reschedule request for{" "}
                                            <strong>{booking.reference}</strong>?
                                            {preferred
                                                ? ` Preferred time: ${new Date(
                                                      preferred
                                                  ).toLocaleString()}.`
                                                : ""}
                                        </p>
                                        <p className="mt-2 text-xs text-muted">
                                            The salon will contact you to confirm a
                                            new time — your original appointment stays
                                            booked until then.
                                        </p>
                                    </>
                                }
                            />
                        )}
                    </>
                )}
            </Card>
        </div>
    );
}
