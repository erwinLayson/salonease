import { useEffect, useMemo, useRef, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { toast } from "../../lib/toast";
import { peso } from "../../lib/utils";

import type { OwnerService, StaffServiceAssignment } from "../../types";

export interface StaffServicesProps {
    staffId: number;
    staffName: string;
    onSaved: (message: string) => void | Promise<void>;
    onDirtyChange?: (isDirty: boolean) => void;
    onCountChange?: (assignedCount: number, totalActiveCount: number) => void;
}

export function StaffServices(props: StaffServicesProps) {
    const { staffId, staffName, onSaved, onDirtyChange, onCountChange } = props;
    const [services, setServices] = useState<OwnerService[]>([]);
    const [initialSelected, setInitialSelected] = useState<number[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let stale = false;
        const load = async () => {
            setLoading(true);
            try {
                const [servicesRes, assignmentRes] = await Promise.all([
                    api.get<{ data: OwnerService[] }>("/owner/services"),
                    api.get<{ data: StaffServiceAssignment }>(
                        `/owner/staff/${staffId}/services`
                    ),
                ]);
                if (!stale) {
                    setServices(servicesRes.data.data);
                    const assigned = assignmentRes.data.data.serviceIds;
                    setInitialSelected(assigned);
                    setSelected(assigned);
                    onDirtyChange?.(false);
                }
            } catch {
                // Failures surface as toast via interceptor
            } finally {
                if (!stale) {
                    setLoading(false);
                }
            }
        };
        void load();
        return () => {
            stale = true;
        };
    }, [staffId, onDirtyChange]);

    const isDirty = useMemo(() => {
        if (selected.length !== initialSelected.length) return true;
        const setA = new Set(selected);
        return initialSelected.some((id) => !setA.has(id));
    }, [selected, initialSelected]);

    const onDirtyChangeRef = useRef(onDirtyChange);
    useEffect(() => {
        onDirtyChangeRef.current = onDirtyChange;
    }, [onDirtyChange]);

    const onCountChangeRef = useRef(onCountChange);
    useEffect(() => {
        onCountChangeRef.current = onCountChange;
    }, [onCountChange]);

    useEffect(() => {
        onDirtyChangeRef.current?.(isDirty);
    }, [isDirty]);

    const activeServices = useMemo(
        () => services.filter((s) => s.is_active === 1),
        [services]
    );

    useEffect(() => {
        onCountChangeRef.current?.(selected.length, activeServices.length);
    }, [selected.length, activeServices.length]);

    const filteredServices = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return services;
        return services.filter((s) =>
            s.name.toLowerCase().includes(term) ||
            s.description?.toLowerCase().includes(term)
        );
    }, [services, search]);

    const toggle = (serviceId: number) => {
        setSelected((current) =>
            current.includes(serviceId)
                ? current.filter((id) => id !== serviceId)
                : [...current, serviceId]
        );
    };

    const selectAllActive = () => {
        const allActiveIds = activeServices.map((s) => s.id);
        setSelected(allActiveIds);
    };

    const deselectAll = () => {
        setSelected([]);
    };

    const resetChanges = () => {
        setSelected(initialSelected);
        toast.info("Service assignments reverted to last saved state.");
    };

    const save = async () => {
        setBusy(true);
        try {
            await api.put(`/owner/staff/${staffId}/services`, {
                serviceIds: selected,
            });
            setInitialSelected(selected);
            onDirtyChange?.(false);
            await onSaved(`Services updated for ${staffName}.`);
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <Card title="Assigned Services">
                <p className="py-6 text-center text-sm text-muted">Loading services…</p>
            </Card>
        );
    }

    return (
        <Card
            title="Assigned Services"
            actions={
                <div className="flex items-center gap-2">
                    {isDirty && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            Unsaved changes
                        </span>
                    )}
                    {isDirty && (
                        <button
                            type="button"
                            onClick={resetChanges}
                            disabled={busy}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted hover:text-charcoal hover:bg-charcoal/5 transition-colors"
                        >
                            Reset
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={busy || !isDirty}
                        aria-busy={busy}
                        onClick={() => void save()}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary-dark px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-primary-press disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {busy ? "Saving services…" : "Save services"}
                    </button>
                </div>
            }
        >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
                <p className="text-xs text-muted max-w-xl">
                    Assign the services <strong>{staffName}</strong> is certified to perform. Customers will only be able to book these services with them.
                </p>
                <div className="text-xs font-medium text-charcoal">
                    <strong>{selected.length}</strong> of {activeServices.length} active services assigned
                </div>
            </div>

            {/* Search and Quick Selection Actions */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
                <div className="w-full sm:w-60">
                    <input
                        type="text"
                        placeholder="Search services…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/40"
                    />
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <button
                        type="button"
                        onClick={selectAllActive}
                        className="font-medium text-primary-dark hover:underline transition-colors"
                    >
                        Select all
                    </button>
                    <span className="text-muted">·</span>
                    <button
                        type="button"
                        onClick={deselectAll}
                        className="font-medium text-muted hover:text-charcoal hover:underline transition-colors"
                    >
                        Deselect all
                    </button>
                </div>
            </div>

            {/* Services List */}
            {services.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted">
                    No services created in the salon menu yet.
                </div>
            ) : filteredServices.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted">
                    No services match “{search}”.
                </div>
            ) : (
                <div className="max-h-[580px] overflow-y-auto pr-1 space-y-2">
                    {filteredServices.map((service) => {
                        const active = service.is_active === 1;
                        const isChecked = selected.includes(service.id);

                        return (
                            <label
                                key={service.id}
                                className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 text-xs transition-all ${
                                    !active
                                        ? "border-border/50 bg-charcoal/[0.02] text-muted opacity-60 cursor-not-allowed"
                                        : isChecked
                                          ? "border-primary/60 bg-primary-light/10 text-charcoal shadow-xs cursor-pointer ring-1 ring-primary/20"
                                          : "border-border bg-surface text-charcoal hover:border-border/80 hover:bg-charcoal/[0.01] cursor-pointer"
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <input
                                        type="checkbox"
                                        checked={active && isChecked}
                                        disabled={!active}
                                        onChange={() => toggle(service.id)}
                                        className="h-4 w-4 rounded accent-primary-dark cursor-pointer shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-charcoal truncate">
                                                {service.name}
                                            </span>
                                            {!active && (
                                                <span className="rounded bg-charcoal/10 px-1.5 py-0.2 text-[10px] font-medium text-muted">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        {service.description && (
                                            <p className="text-[11px] text-muted truncate mt-0.5">
                                                {service.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <p className="font-bold text-charcoal">
                                        {peso(service.price)}
                                    </p>
                                    <p className="text-[11px] text-muted">
                                        ⏱ {service.duration_minutes} min
                                    </p>
                                </div>
                            </label>
                        );
                    })}
                </div>
            )}

            {/* Bottom Save Bar */}
            <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-3">
                <span className="text-xs text-muted">
                    {isDirty ? "You have unsaved service changes." : "Service assignments saved."}
                </span>
                <button
                    type="button"
                    disabled={busy || !isDirty}
                    aria-busy={busy}
                    onClick={() => void save()}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary-dark px-4 py-2 text-xs font-medium text-white shadow-xs transition-colors hover:bg-primary-press disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {busy ? "Saving services…" : "Save services"}
                </button>
            </div>
        </Card>
    );
}
