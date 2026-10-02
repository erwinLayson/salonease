import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { toast } from "../../lib/toast";

// UI components
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Modal } from "../../components/ui/Modal";

// Feature components
import { StaffForm } from "../../components/owner/StaffForm";
import { StaffServices } from "../../components/owner/StaffServices";
import { StaffSchedule } from "../../components/owner/StaffSchedule";
import { IconAction } from "../../components/owner/IconAction";

// Icons (react-icons, Feather set)
import { FiClock, FiEdit2, FiPower, FiTrash2 } from "react-icons/fi";

// Types
import type { DeactivationImpact, OwnerStaff } from "../../types";

// Utilities
import { formatDateTime } from "../../lib/utils";

const fullName = (member: OwnerStaff): string =>
    `${member.first_name} ${member.last_name}`.trim();

export default function StaffPage() {
    const [staff, setStaff] = useState<OwnerStaff[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [search, setSearch] = useState("");

    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<OwnerStaff | null>(null);
    // The detail view lives in the URL (?detail=<id>) so other pages can
    // deep-link straight to a staff member's Services & hours.
    const [searchParams, setSearchParams] = useSearchParams();
    const rawDetail = searchParams.get("detail");
    const detailId =
        rawDetail !== null && /^\d+$/.test(rawDetail) ? Number(rawDetail) : null;
    const openDetail = (id: number) => {
        setSearchParams({ detail: String(id) });
        window.scrollTo({ top: 0 });
    };
    const closeDetail = () => setSearchParams({});
    const [pendingDeactivation, setPendingDeactivation] = useState<{
        staff: OwnerStaff;
        impact: DeactivationImpact;
    } | null>(null);
    const [deactivateFor, setDeactivateFor] = useState<OwnerStaff | null>(null);
    const [deleteFor, setDeleteFor] = useState<OwnerStaff | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<{ data: OwnerStaff[] }>("/owner/staff", {
                params: { includeInactive: true },
            });
            setStaff(res.data.data);
        } catch {
            // The axios interceptor surfaces failures as a toast.
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Defer to a microtask so the effect body stays synchronous-free.
        void Promise.resolve().then(reload);
    }, [reload]);

    const setStatus = async (
        member: OwnerStaff,
        isActive: boolean,
        force = false
    ) => {
        setBusy(true);
        try {
            await api.patch(`/owner/staff/${member.id}/status`, {
                isActive,
                force,
            });
            toast.success(
                `${fullName(member)} ${isActive ? "activated" : "deactivated"}.`
            );
            setDeactivateFor(null);
            setPendingDeactivation(null);
            await reload();
        } catch (err) {
            // Deactivating staff with future bookings is refused with a 409
            // warning payload — surface it for explicit confirmation.
            if (
                !isActive &&
                !force &&
                axios.isAxiosError(err) &&
                err.response?.status === 409
            ) {
                const data = err.response.data as { warning?: DeactivationImpact } | undefined;
                if (data?.warning) {
                    setDeactivateFor(null);
                    setPendingDeactivation({ staff: member, impact: data.warning });
                    return;
                }
            }
            // Other failures surface as a toast via the interceptor.
        } finally {
            setBusy(false);
        }
    };

    const remove = async (member: OwnerStaff) => {
        setBusy(true);
        try {
            await api.delete(`/owner/staff/${member.id}`);
            toast.success(`${fullName(member)} deleted.`);
            setDeleteFor(null);
            if (detailId === member.id) {
                closeDetail();
            }
            await reload();
        } catch {
            // 409: appointment history blocks deletion — deactivate instead.
            // Other failures surface as a toast via the interceptor.
        } finally {
            setBusy(false);
        }
    };

    const detail = detailId === null ? null : staff.find((m) => m.id === detailId) ?? null;

    // The team is small, so filtering the loaded list keeps search
    // instant — no extra request per keystroke.
    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return staff;
        return staff.filter((member) =>
            [
                member.first_name,
                member.last_name,
                member.position,
                member.email,
                member.phone,
                member.username,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(term)
        );
    }, [staff, search]);

    // Full-page view: "Services & hours" replaces the whole staff content.
    if (detail !== null) {
        return (
            <div className="grid gap-6">
                <header>
                    <button
                        type="button"
                        onClick={closeDetail}
                        className="mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-charcoal transition-colors hover:bg-charcoal/5"
                    >
                        <span aria-hidden>←</span> Back to team
                    </button>
                    <h1 className="text-xl font-semibold tracking-tight">
                        {fullName(detail)} — services &amp; hours
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                        Assign the services {fullName(detail).split(" ")[0]} offers and
                        set their working hours.
                    </p>
                </header>
                <div className="grid items-start gap-6 lg:grid-cols-2">
                    <StaffServices
                        staffId={detail.id}
                        staffName={fullName(detail)}
                        onSaved={(message) => toast.success(message)}
                    />
                    <StaffSchedule
                        staffId={detail.id}
                        staffName={fullName(detail)}
                        onSaved={(message) => toast.success(message)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Staff</h1>
                    <p className="mt-1 text-sm text-muted">
                        Manage accounts, services and working hours.
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
                    {creating ? "Close" : "Add staff member"}
                </button>
            </header>


            {creating && (
                <Modal
                    title="New staff member"
                    onClose={() => setCreating(false)}
                >
                    <StaffForm
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
                <Modal
                    title={`Edit ${fullName(editing)}`}
                    onClose={() => setEditing(null)}
                >
                    <StaffForm
                        staff={editing}
                        onDone={async (message) => {
                            setEditing(null);
                            toast.success(message);
                            await reload();
                        }}
                        onCancel={() => setEditing(null)}
                    />
                </Modal>
            )}

            {pendingDeactivation !== null && (
                <ConfirmDialog
                    title={`Deactivate ${pendingDeactivation.impact.staffName}?`}
                    confirmLabel="Deactivate anyway"
                    cancelLabel="Keep active"
                    busy={busy}
                    busyLabel="Deactivating…"
                    onConfirm={() =>
                        void setStatus(pendingDeactivation.staff, false, true)
                    }
                    onCancel={() => setPendingDeactivation(null)}
                    message={
                        <>
                            <p>
                                <strong>{pendingDeactivation.impact.staffName}</strong> still
                                has{" "}
                                <strong>
                                    {pendingDeactivation.impact.futureAppointments}
                                </strong>{" "}
                                upcoming appointment
                                {pendingDeactivation.impact.futureAppointments === 1
                                    ? ""
                                    : "s"}
                                :
                            </p>
                            <ul className="mt-2 space-y-1">
                                {pendingDeactivation.impact.appointments.map(
                                    (appointment) => (
                                        <li
                                            key={appointment.id}
                                            className="rounded-lg bg-charcoal/5 px-3 py-2 text-sm"
                                        >
                                            <span className="font-mono font-medium">
                                                {appointment.reference}
                                            </span>
                                            <span className="ml-2 text-muted">
                                                {formatDateTime(appointment.start_at)}
                                            </span>
                                            <span className="ml-2 text-xs text-muted">
                                                {appointment.status}
                                            </span>
                                        </li>
                                    )
                                )}
                            </ul>
                            <p className="mt-3 text-xs text-muted">
                                Deactivating blocks new bookings and signs this staff
                                member out of their account.
                            </p>
                        </>
                    }
                />
            )}

            {deactivateFor !== null && (
                <ConfirmDialog
                    title={`Deactivate ${fullName(deactivateFor)}?`}
                    confirmLabel="Deactivate"
                    busy={busy}
                    busyLabel="Deactivating…"
                    onConfirm={() => void setStatus(deactivateFor, false)}
                    onCancel={() => setDeactivateFor(null)}
                    message={
                        <>
                            Deactivate <strong>{fullName(deactivateFor)}</strong>? This
                            blocks new bookings with them and signs them out. You can
                            reactivate them at any time.
                        </>
                    }
                />
            )}

            {deleteFor !== null && (
                <ConfirmDialog
                    title="Delete staff member"
                    confirmLabel="Delete"
                    busy={busy}
                    busyLabel="Deleting…"
                    onConfirm={() => void remove(deleteFor)}
                    onCancel={() => setDeleteFor(null)}
                    message={
                        <>
                            <p>
                                Delete <strong>{fullName(deleteFor)}</strong> and their
                                login account? This cannot be undone.
                            </p>
                            <p className="mt-2 text-xs text-muted">
                                Staff with appointment history cannot be deleted —
                                deactivate them instead.
                            </p>
                        </>
                    }
                />
            )}

            <Card>
                <Field
                    label="Search"
                    placeholder="Name, position, email or username…"
                    value={search}
                    onChange={setSearch}
                />
            </Card>

            <Card title={`Team (${filtered.length})`}>
                {loading ? (
                    <p className="py-4 text-center text-sm text-muted">
                        Loading…
                    </p>
                ) : staff.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted">
                        No staff yet — add your first team member.
                    </p>
                ) : filtered.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted">
                        No staff match “{search.trim()}”.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th
                                        scope="col"
                                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted"
                                    >
                                        Staff member
                                    </th>
                                    <th
                                        scope="col"
                                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted"
                                    >
                                        Status
                                    </th>
                                    <th
                                        scope="col"
                                        className="hidden whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted md:table-cell"
                                    >
                                        Contact
                                    </th>
                                    <th
                                        scope="col"
                                        className="hidden whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted md:table-cell"
                                    >
                                        Login
                                    </th>
                                    <th
                                        scope="col"
                                        className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted"
                                    >
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((member) => (
                                    <tr
                                        key={member.id}
                                        className="border-b border-border transition-colors last:border-b-0 hover:bg-charcoal/5"
                                    >
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <p className="font-medium text-charcoal">
                                                        {fullName(member)}
                                                    </p>
                                                    {member.position && (
                                                        <p className="mt-0.5 text-xs text-muted">
                                                            {member.position}
                                                        </p>
                                                    )}
                                                    {/* Contact & login stack under the name on phones (columns hide below md). */}
                                                    <div className="mt-1 grid gap-0.5 whitespace-normal break-words text-xs text-muted md:hidden">
                                                        {member.email && (
                                                            <span>{member.email}</span>
                                                        )}
                                                        {member.phone && (
                                                            <span>{member.phone}</span>
                                                        )}
                                                        {member.username && (
                                                            <span>{member.username}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    member.is_active === 1
                                                        ? "bg-success-bg text-success"
                                                        : "bg-charcoal/10 text-charcoal"
                                                }`}
                                            >
                                                {member.is_active === 1
                                                    ? "Active"
                                                    : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                                            {member.email || member.phone ? (
                                                <div className="grid gap-0.5 text-xs text-muted">
                                                    {member.email && (
                                                        <span>
                                                            {member.email}
                                                        </span>
                                                    )}
                                                    {member.phone && (
                                                        <span>
                                                            {member.phone}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-muted md:table-cell">
                                            {member.username ??
                                                "No login account"}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <div className="flex flex-wrap justify-end gap-1">
                                                <IconAction
                                                    label="Edit"
                                                    icon={
                                                        <FiEdit2 size={16} />
                                                    }
                                                    disabled={busy}
                                                    onClick={() => {
                                                        setCreating(false);
                                                        setEditing(member);
                                                    }}
                                                />
                                                <IconAction
                                                    label="Services & hours"
                                                    icon={
                                                        <FiClock size={16} />
                                                    }
                                                    disabled={busy}
                                                    onClick={() =>
                                                        openDetail(member.id)
                                                    }
                                                />
                                                {member.is_active === 1 ? (
                                                    <IconAction
                                                        label="Deactivate"
                                                        icon={
                                                            <FiPower size={16} />
                                                        }
                                                        disabled={busy}
                                                        onClick={() =>
                                                            setDeactivateFor(
                                                                member
                                                            )
                                                        }
                                                    />
                                                ) : (
                                                    <IconAction
                                                        label="Activate"
                                                        icon={
                                                            <FiPower size={16} />
                                                        }
                                                        disabled={busy}
                                                        onClick={() =>
                                                            void setStatus(
                                                                member,
                                                                true
                                                            )
                                                        }
                                                    />
                                                )}
                                                <IconAction
                                                    label="Delete"
                                                    variant="danger"
                                                    icon={
                                                        <FiTrash2 size={16} />
                                                    }
                                                    disabled={busy}
                                                    onClick={() =>
                                                        setDeleteFor(member)
                                                    }
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
