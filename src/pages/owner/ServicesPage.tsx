import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { toast } from "../../lib/toast";

// UI components
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Modal } from "../../components/ui/Modal";

// Feature components
import { ServiceForm } from "../../components/owner/ServiceForm";
import { StatusAction } from "../../components/owner/StatusAction";

// Types
import type { OwnerService } from "../../types";

// Utilities
import { peso } from "../../lib/utils";

export default function ServicesPage() {
    const [services, setServices] = useState<OwnerService[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<OwnerService | null>(null);
    const [deactivateFor, setDeactivateFor] = useState<OwnerService | null>(null);
    const [deleteFor, setDeleteFor] = useState<OwnerService | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<{ data: OwnerService[] }>("/owner/services", {
                params: { includeInactive: true },
            });
            setServices(res.data.data);
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Defer to a microtask so the effect body stays synchronous-free.
        void Promise.resolve().then(reload);
    }, [reload]);

    const setStatus = async (service: OwnerService, isActive: boolean) => {
        setBusy(true);
        try {
            await api.patch(`/owner/services/${service.id}/status`, { isActive });
            toast.success(`${service.name} ${isActive ? "activated" : "deactivated"}.`);
            setDeactivateFor(null);
            await reload();
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setBusy(false);
        }
    };

    const remove = async (service: OwnerService) => {
        setBusy(true);
        try {
            await api.delete(`/owner/services/${service.id}`);
            toast.success(`${service.name} deleted.`);
            setDeleteFor(null);
            await reload();
        } catch {
            // 409: appointment history blocks deletion — deactivate instead.
            // Other failures surface as a toast via the interceptor.
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="grid gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Services</h1>
                    <p className="mt-1 text-sm text-muted">
                        Manage the salon's service menu.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setEditing(null);
                        setCreating((value) => !value);
                    }}
                    className="rounded-lg bg-primary-dark min-h-11 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-press"
                >
                    {creating ? "Close" : "Add service"}
                </button>
            </header>

            {creating && (
                <Modal title="New service" onClose={() => setCreating(false)}>
                    <ServiceForm
                        onDone={async (message) => {
                            setCreating(false);
                            toast.success(message);
                            await reload();
                        }}
                        onCancel={() => setCreating(false)}
                    />
                </Modal>
            )}

            {editing !== null && (
                <Modal title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
                    <ServiceForm
                        service={editing}
                        onDone={async (message) => {
                            setEditing(null);
                            toast.success(message);
                            await reload();
                        }}
                        onCancel={() => setEditing(null)}
                    />
                </Modal>
            )}

            {deactivateFor !== null && (
                <ConfirmDialog
                    title={`Deactivate ${deactivateFor.name}?`}
                    confirmLabel="Deactivate"
                    busy={busy}
                    busyLabel="Deactivating…"
                    onConfirm={() => void setStatus(deactivateFor, false)}
                    onCancel={() => setDeactivateFor(null)}
                    message={
                        <>
                            Deactivate <strong>{deactivateFor.name}</strong>? It will be
                            hidden from the public booking menu until you reactivate it.
                        </>
                    }
                />
            )}

            {deleteFor !== null && (
                <ConfirmDialog
                    title="Delete service"
                    confirmLabel="Delete"
                    busy={busy}
                    busyLabel="Deleting…"
                    onConfirm={() => void remove(deleteFor)}
                    onCancel={() => setDeleteFor(null)}
                    message={
                        <>
                            <p>
                                Delete <strong>{deleteFor.name}</strong>? This cannot be
                                undone.
                            </p>
                            <p className="mt-2 text-xs text-muted">
                                Services with appointment history cannot be deleted —
                                deactivate them instead.
                            </p>
                        </>
                    }
                />
            )}

            <Card title={`Services (${services.length})`}>
                {loading ? (
                    <p className="py-4 text-center text-sm text-muted">
                        Loading…
                    </p>
                ) : services.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted">
                        No services yet — add your first service.
                    </p>
                ) : (
                    <ul className="grid gap-3">
                        {services.map((service) => (
                            <li
                                key={service.id}
                                className="rounded-xl border border-border p-4 transition-colors hover:border-primary/70"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium">{service.name}</span>
                                    <span className="rounded bg-charcoal/5 px-1.5 py-0.5 text-[11px] text-muted">
                                        {service.duration_minutes} min
                                    </span>
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                            service.is_active === 1
                                                ? "bg-success-bg text-success"
                                                : "bg-charcoal/10 text-charcoal"
                                        }`}
                                    >
                                        {service.is_active === 1 ? "Active" : "Inactive"}
                                    </span>
                                    <span className="ml-auto text-sm font-semibold">
                                        {peso(service.price)}
                                    </span>
                                </div>
                                {service.description && (
                                    <p className="mt-1 text-sm text-muted">
                                        {service.description}
                                    </p>
                                )}
                                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                                    <StatusAction
                                        label="Edit"
                                        disabled={busy}
                                        onClick={() => {
                                            setCreating(false);
                                            setEditing(service);
                                        }}
                                    />
                                    {service.is_active === 1 ? (
                                        <StatusAction
                                            label="Deactivate"
                                            disabled={busy}
                                            onClick={() => setDeactivateFor(service)}
                                        />
                                    ) : (
                                        <StatusAction
                                            label="Activate"
                                            disabled={busy}
                                            onClick={() => void setStatus(service, true)}
                                        />
                                    )}
                                    <StatusAction
                                        label="Delete"
                                        disabled={busy}
                                        onClick={() => setDeleteFor(service)}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}
