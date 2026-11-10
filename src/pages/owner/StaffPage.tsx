import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { toast } from "../../lib/toast";

// UI components
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Select } from "../../components/ui/Select";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Modal } from "../../components/ui/Modal";
import { CalendarIcon, ClockIcon, UsersIcon } from "../../components/ui/icons";

// Feature components
import { StaffForm } from "../../components/owner/StaffForm";
import { StaffServices } from "../../components/owner/StaffServices";
import { StaffSchedule } from "../../components/owner/StaffSchedule";
import { IconAction } from "../../components/owner/IconAction";
import { LeaveRequestsSection } from "../../components/owner/LeaveRequestsSection";

// Icons (react-icons, Feather set)
import { FiClock, FiEdit2, FiPower, FiTrash2 } from "react-icons/fi";

// Types
import type { DeactivationImpact, LeaveRequest, OwnerStaff } from "../../types";

// Utilities
import { formatDateTime, formatDuration } from "../../lib/utils";

const fullName = (member: OwnerStaff): string =>
    `${member.first_name} ${member.last_name}`.trim();

type StaffTab = "team" | "schedules" | "leave";

export default function StaffPage() {
    const [staff, setStaff] = useState<OwnerStaff[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [search, setSearch] = useState("");
    const [pendingLeaveCount, setPendingLeaveCount] = useState(0);

    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<OwnerStaff | null>(null);

    const [searchParams, setSearchParams] = useSearchParams();

    // Tab navigation (team | schedules | leave)
    const rawTab = searchParams.get("tab") as StaffTab | null;
    const rawStaffId = searchParams.get("staffId");
    const rawDetail = searchParams.get("detail");

    const activeTab: StaffTab = useMemo(() => {
        if (rawTab === "schedules" || rawTab === "leave") return rawTab;
        if (rawTab === "team") return "team";
        if (rawDetail !== null) return "schedules";
        return "team";
    }, [rawTab, rawDetail]);

    const initialStaffId =
        rawStaffId && /^\d+$/.test(rawStaffId)
            ? Number(rawStaffId)
            : rawDetail && /^\d+$/.test(rawDetail)
              ? Number(rawDetail)
              : null;

    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(initialStaffId);

    // Track unsaved changes in Schedules & Services to protect against accidental loss
    const [hoursDirty, setHoursDirty] = useState(false);
    const [servicesDirty, setServicesDirty] = useState(false);
    const [pendingSwitchStaff, setPendingSwitchStaff] = useState<OwnerStaff | null>(null);

    // Live KPI statistics for selected staff member in Schedules tab
    const [scheduleStats, setScheduleStats] = useState({
        workingDays: 0,
        totalMinutes: 0,
        avgDailyMinutes: 0,
    });
    const [servicesCount, setServicesCount] = useState({
        assigned: 0,
        total: 0,
    });

    const handlePendingLeaveCountChange = useCallback((count: number) => {
        setPendingLeaveCount((prev) => (prev === count ? prev : count));
    }, []);

    const handleServicesCountChange = useCallback((assigned: number, total: number) => {
        setServicesCount((prev) =>
            prev.assigned === assigned && prev.total === total ? prev : { assigned, total }
        );
    }, []);

    const handleScheduleStatsChange = useCallback(
        (stats: { workingDays: number; totalMinutes: number; avgDailyMinutes: number }) => {
            setScheduleStats((prev) =>
                prev.workingDays === stats.workingDays &&
                prev.totalMinutes === stats.totalMinutes &&
                prev.avgDailyMinutes === stats.avgDailyMinutes
                    ? prev
                    : stats
            );
        },
        []
    );

    const handleTabChange = (nextTab: StaffTab) => {
        if (activeTab === "schedules" && nextTab !== "schedules" && (hoursDirty || servicesDirty)) {
            const confirmed = window.confirm(
                "You have unsaved schedule or service changes. Are you sure you want to leave this tab?"
            );
            if (!confirmed) return;
            setHoursDirty(false);
            setServicesDirty(false);
        }

        const nextParams: Record<string, string> = { tab: nextTab };
        if (nextTab === "schedules" && selectedStaffId !== null) {
            nextParams.staffId = String(selectedStaffId);
        }
        setSearchParams(nextParams);
    };

    const openScheduleForStaff = (id: number) => {
        setSelectedStaffId(id);
        setSearchParams({ tab: "schedules", staffId: String(id) });
        window.scrollTo({ top: 0 });
    };

    // Safe switching between staff members with unsaved changes protection
    const requestStaffSwitch = (targetStaff: OwnerStaff) => {
        if (hoursDirty || servicesDirty) {
            setPendingSwitchStaff(targetStaff);
        } else {
            setSelectedStaffId(targetStaff.id);
            setSearchParams({ tab: "schedules", staffId: String(targetStaff.id) });
        }
    };

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
            // Interceptor toast
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(reload);
    }, [reload]);

    // Initial pending leave requests count for tab notification badge
    useEffect(() => {
        let stale = false;
        const checkPendingLeave = async () => {
            try {
                const res = await api.get<{ data: LeaveRequest[] }>(
                    "/owner/leave-requests",
                    { params: { status: "pending" } }
                );
                if (!stale) {
                    setPendingLeaveCount(res.data.data.length);
                }
            } catch {
                // Interceptor toast
            }
        };
        void checkPendingLeave();
        return () => {
            stale = true;
        };
    }, []);

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
            if (selectedStaffId === member.id) {
                setSelectedStaffId(null);
            }
            await reload();
        } catch {
            // 409: appointment history blocks deletion — deactivate instead.
        } finally {
            setBusy(false);
        }
    };

    // Filter staff list in Team tab
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

    // Active staff member for the Schedules tab
    const activeScheduleStaff = useMemo(() => {
        if (staff.length === 0) return null;
        if (selectedStaffId !== null) {
            const found = staff.find((m) => m.id === selectedStaffId);
            if (found) return found;
        }
        return staff.find((m) => m.is_active === 1) ?? staff[0] ?? null;
    }, [staff, selectedStaffId]);

    return (
        <div className="grid gap-6">
            {/* Page Header */}
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        {activeTab === "schedules"
                            ? "Staff Schedule"
                            : activeTab === "leave"
                              ? "Staff Leave Requests"
                              : "Staff"}
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                        {activeTab === "schedules"
                            ? "Manage recurring working hours and assigned services."
                            : activeTab === "leave"
                              ? "Review time-off requests and manage employee leave availability."
                              : "Central employee management: accounts, recurring working schedules and leave requests."}
                    </p>
                </div>

                {activeTab === "team" && (
                    <button
                        type="button"
                        onClick={() => {
                            setEditing(null);
                            setCreating(true);
                        }}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-dark px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-press"
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add staff member
                    </button>
                )}
            </header>

            {/* Navigation Tabs */}
            <div className="border-b border-border">
                <nav className="-mb-px flex gap-6" aria-label="Staff module tabs">
                    <button
                        type="button"
                        onClick={() => handleTabChange("team")}
                        className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
                            activeTab === "team"
                                ? "border-primary-dark text-primary-dark font-semibold"
                                : "border-transparent text-muted hover:border-border hover:text-charcoal"
                        }`}
                    >
                        <UsersIcon />
                        <span>Team ({staff.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange("schedules")}
                        className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
                            activeTab === "schedules"
                                ? "border-primary-dark text-primary-dark font-semibold"
                                : "border-transparent text-muted hover:border-border hover:text-charcoal"
                        }`}
                    >
                        <ClockIcon />
                        <span>Schedules</span>
                        {(hoursDirty || servicesDirty) && (
                            <span className="h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange("leave")}
                        className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
                            activeTab === "leave"
                                ? "border-primary-dark text-primary-dark font-semibold"
                                : "border-transparent text-muted hover:border-border hover:text-charcoal"
                        }`}
                    >
                        <CalendarIcon />
                        <span>Leave Requests</span>
                        {pendingLeaveCount > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                {pendingLeaveCount}
                            </span>
                        )}
                    </button>
                </nav>
            </div>

            {/* Confirmation Dialog for switching staff with unsaved changes */}
            {pendingSwitchStaff !== null && (
                <ConfirmDialog
                    title="Discard unsaved changes?"
                    message={
                        <>
                            <p>
                                You have unsaved schedule or service changes for{" "}
                                <strong>{activeScheduleStaff ? fullName(activeScheduleStaff) : "this employee"}</strong>.
                            </p>
                            <p className="mt-2 text-xs text-muted">
                                Switching to <strong>{fullName(pendingSwitchStaff)}</strong> will discard your edits.
                            </p>
                        </>
                    }
                    confirmLabel="Discard &amp; switch"
                    cancelLabel="Keep editing"
                    onConfirm={() => {
                        setHoursDirty(false);
                        setServicesDirty(false);
                        setSelectedStaffId(pendingSwitchStaff.id);
                        setSearchParams({ tab: "schedules", staffId: String(pendingSwitchStaff.id) });
                        setPendingSwitchStaff(null);
                    }}
                    onCancel={() => setPendingSwitchStaff(null)}
                />
            )}

            {/* Modals & Dialogs for Team Tab */}
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

            {/* TAB 1: TEAM */}
            {activeTab === "team" && (
                <>
                    <Card>
                        <Field
                            label="Search team"
                            placeholder="Search by name, position, email, phone or username…"
                            value={search}
                            onChange={setSearch}
                        />
                    </Card>

                    <Card title={`Team Members (${filtered.length})`}>
                        {loading ? (
                            <p className="py-6 text-center text-sm text-muted">
                                Loading team directory…
                            </p>
                        ) : staff.length === 0 ? (
                            <div className="py-8 text-center">
                                <p className="text-sm font-medium">No staff members yet</p>
                                <p className="mt-1 text-xs text-muted">
                                    Add your first team member to manage their services and schedules.
                                </p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-8 text-center">
                                <p className="text-sm font-medium">
                                    No staff match “{search.trim()}”
                                </p>
                                <p className="mt-1 text-xs text-muted">
                                    Try a different name, role or username.
                                </p>
                            </div>
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
                                                    <div>
                                                        <p className="font-medium text-charcoal">
                                                            {fullName(member)}
                                                        </p>
                                                        {member.position && (
                                                            <p className="mt-0.5 text-xs text-muted">
                                                                {member.position}
                                                            </p>
                                                        )}
                                                        <div className="mt-1 grid gap-0.5 whitespace-normal break-words text-xs text-muted md:hidden">
                                                            {member.email && <span>{member.email}</span>}
                                                            {member.phone && <span>{member.phone}</span>}
                                                            {member.username && <span>@{member.username}</span>}
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
                                                        {member.is_active === 1 ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                                <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                                                    {member.email || member.phone ? (
                                                        <div className="grid gap-0.5 text-xs text-muted">
                                                            {member.email && <span>{member.email}</span>}
                                                            {member.phone && <span>{member.phone}</span>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted">—</span>
                                                    )}
                                                </td>
                                                <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-muted md:table-cell">
                                                    {member.username ? `@${member.username}` : "No login account"}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="flex flex-wrap justify-end gap-1">
                                                        <IconAction
                                                            label="Edit details"
                                                            icon={<FiEdit2 size={16} />}
                                                            disabled={busy}
                                                            onClick={() => {
                                                                setCreating(false);
                                                                setEditing(member);
                                                            }}
                                                        />
                                                        <IconAction
                                                            label="Working hours & services"
                                                            icon={<FiClock size={16} />}
                                                            disabled={busy}
                                                            onClick={() => openScheduleForStaff(member.id)}
                                                        />
                                                        {member.is_active === 1 ? (
                                                            <IconAction
                                                                label="Deactivate"
                                                                icon={<FiPower size={16} />}
                                                                disabled={busy}
                                                                onClick={() => setDeactivateFor(member)}
                                                            />
                                                        ) : (
                                                            <IconAction
                                                                label="Activate"
                                                                icon={<FiPower size={16} />}
                                                                disabled={busy}
                                                                onClick={() => void setStatus(member, true)}
                                                            />
                                                        )}
                                                        <IconAction
                                                            label="Delete"
                                                            variant="danger"
                                                            icon={<FiTrash2 size={16} />}
                                                            disabled={busy}
                                                            onClick={() => setDeleteFor(member)}
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
                </>
            )}

            {/* TAB 2: SCHEDULES & SERVICES WORKSPACE */}
            {activeTab === "schedules" && (
                <>
                    {staff.length === 0 ? (
                        <Card>
                            <div className="py-8 text-center">
                                <p className="text-sm font-medium">No staff members found</p>
                                <p className="mt-1 text-xs text-muted">
                                    Please add a staff member in the Team tab before setting working schedules.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => handleTabChange("team")}
                                    className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-xs font-medium text-charcoal hover:bg-charcoal/5"
                                >
                                    Go to Team
                                </button>
                            </div>
                        </Card>
                    ) : !activeScheduleStaff ? (
                        <Card>
                            <p className="py-6 text-center text-sm text-muted">
                                Select a staff member to view and manage their schedule.
                            </p>
                        </Card>
                    ) : (
                        <div className="grid gap-6">
                            {/* Staff Member Selector & Schedule KPI Summary Bar */}
                            <Card>
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-3">
                                        <div className="w-full sm:w-80">
                                            <Select
                                                label="Selected team member"
                                                value={String(activeScheduleStaff.id)}
                                                onChange={(val) => {
                                                    const target = staff.find((m) => m.id === Number(val));
                                                    if (target) {
                                                        requestStaffSwitch(target);
                                                    }
                                                }}
                                                options={staff.map((m) => ({
                                                    value: String(m.id),
                                                    label: `${fullName(m)}${m.position ? ` · ${m.position}` : ""}${m.is_active === 1 ? "" : " (Inactive)"}`,
                                                }))}
                                            />
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-charcoal">
                                                    {fullName(activeScheduleStaff)}
                                                </p>
                                                <p className="text-xs text-muted">
                                                    {activeScheduleStaff.position || "Staff"} ·{" "}
                                                    {activeScheduleStaff.email || activeScheduleStaff.phone || "No contact info"}
                                                </p>
                                            </div>
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                    activeScheduleStaff.is_active === 1
                                                        ? "bg-success-bg text-success"
                                                        : "bg-charcoal/10 text-charcoal"
                                                }`}
                                            >
                                                {activeScheduleStaff.is_active === 1 ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Summary Stats Strip */}
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        <div className="rounded-xl border border-border/70 bg-charcoal/[0.02] p-3 text-center sm:text-left">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                                                Weekly Hours
                                            </p>
                                            <p className="mt-1 text-lg font-bold text-charcoal">
                                                {formatDuration(scheduleStats.totalMinutes)}
                                            </p>
                                            <p className="text-[10px] text-muted">Total scheduled</p>
                                        </div>

                                        <div className="rounded-xl border border-border/70 bg-charcoal/[0.02] p-3 text-center sm:text-left">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                                                Working Days
                                            </p>
                                            <p className="mt-1 text-lg font-bold text-charcoal">
                                                {scheduleStats.workingDays} / 7 days
                                            </p>
                                            <p className="text-[10px] text-muted">
                                                {7 - scheduleStats.workingDays} day{7 - scheduleStats.workingDays === 1 ? "" : "s"} off
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-border/70 bg-charcoal/[0.02] p-3 text-center sm:text-left">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                                                Daily Average
                                            </p>
                                            <p className="mt-1 text-lg font-bold text-charcoal">
                                                {formatDuration(scheduleStats.avgDailyMinutes)}
                                            </p>
                                            <p className="text-[10px] text-muted">Per working day</p>
                                        </div>

                                        <div className="rounded-xl border border-border/70 bg-charcoal/[0.02] p-3 text-center sm:text-left">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                                                Services Assigned
                                            </p>
                                            <p className="mt-1 text-lg font-bold text-charcoal">
                                                {servicesCount.assigned}
                                            </p>
                                            <p className="text-[10px] text-muted">
                                                Of {servicesCount.total} active services
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Main Content: Working Hours (larger width) & Assigned Services */}
                            <div className="grid items-start gap-6 lg:grid-cols-12">
                                <div className="lg:col-span-7">
                                    <StaffSchedule
                                        key={`sched-${activeScheduleStaff.id}`}
                                        staffId={activeScheduleStaff.id}
                                        staffName={fullName(activeScheduleStaff)}
                                        onSaved={(message) => toast.success(message)}
                                        onDirtyChange={setHoursDirty}
                                        onStatsChange={handleScheduleStatsChange}
                                    />
                                </div>

                                <div className="lg:col-span-5">
                                    <StaffServices
                                        key={`serv-${activeScheduleStaff.id}`}
                                        staffId={activeScheduleStaff.id}
                                        staffName={fullName(activeScheduleStaff)}
                                        onSaved={(message) => toast.success(message)}
                                        onDirtyChange={setServicesDirty}
                                        onCountChange={handleServicesCountChange}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* TAB 3: LEAVE REQUESTS */}
            {activeTab === "leave" && (
                <LeaveRequestsSection
                    staffList={staff}
                    onPendingCountChange={handlePendingLeaveCountChange}
                />
            )}
        </div>
    );
}
