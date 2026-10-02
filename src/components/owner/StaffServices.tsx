import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card } from "../../components/ui/Card";

import type { OwnerService, StaffServiceAssignment } from "../../types";

export function StaffServices(props: {
    staffId: number;
    staffName: string;
    onSaved: (message: string) => void | Promise<void>;
}) {
    const { staffId } = props;
    const [services, setServices] = useState<OwnerService[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [servicesRes, assignmentRes] = await Promise.all([
                    api.get<{ data: OwnerService[] }>("/owner/services"),
                    api.get<{ data: StaffServiceAssignment }>(
                        `/owner/staff/${staffId}/services`
                    ),
                ]);
                setServices(servicesRes.data.data);
                setSelected(assignmentRes.data.data.serviceIds);
            } catch {
                // Failures surface as a toast via the axios error interceptor.
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [staffId]);

    const toggle = (serviceId: number) => {
        setSelected((current) =>
            current.includes(serviceId)
                ? current.filter((id) => id !== serviceId)
                : [...current, serviceId]
        );
    };

    const save = async () => {
        setBusy(true);
        try {
            await api.put(`/owner/staff/${staffId}/services`, {
                serviceIds: selected,
            });
            await props.onSaved(
                `Services updated for ${props.staffName}.`
            );
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <Card title="Services">
                <p className="text-sm opacity-70">Loading…</p>
            </Card>
        );
    }

    return (
        <Card title="Services">
            {services.length === 0 ? (
                <p className="text-sm opacity-70">No services available yet.</p>
            ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                    {services.map((service) => {
                        const active = service.is_active === 1;
                        const checked = selected.includes(service.id);
                        return (
                            <li key={service.id}>
                                <label
                                    className={`flex items-center gap-2.5 text-sm ${active ? "cursor-pointer" : "text-muted"}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={active && checked}
                                        disabled={!active}
                                        onChange={() => toggle(service.id)}
                                        className="h-4 w-4 accent-primary-dark"
                                    />
                                    <span className="flex-1">
                                        {service.name}
                                        <span className="ml-2 text-xs text-muted">
                                            {service.duration_minutes} min
                                        </span>
                                    </span>
                                    {!active && (
                                        <span className="text-xs text-muted">
                                            inactive
                                        </span>
                                    )}
                                </label>
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="mt-4 flex justify-end">
                <button
                    type="button"
                    disabled={busy} aria-busy={busy}
                    onClick={() => void save()}
                    className="rounded-md bg-primary-dark min-h-11 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                    {busy ? "Saving…" : "Save services"}
                </button>
            </div>
        </Card>
    );
}
