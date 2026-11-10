import { useEffect, useMemo, useRef, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { toast } from "../../lib/toast";
import { formatDuration, WEEKDAY_NAMES } from "../../lib/utils";

import type { ScheduleBlock, StaffScheduleRow } from "../../types";

/** "HH:mm:ss" -> "HH:mm" for time inputs. */
const toTimeInput = (value: string): string => value.slice(0, 5);

const toBlocks = (rows: StaffScheduleRow[]): ScheduleBlock[] =>
    rows.map((row) => ({
        weekday: row.weekday,
        startTime: toTimeInput(row.start_time),
        endTime: toTimeInput(row.end_time),
    }));

/** Calculates total minutes of a valid block. Returns 0 if incomplete or invalid. */
const blockMinutes = (block: ScheduleBlock): number => {
    if (block.startTime.length < 5 || block.endTime.length < 5 || block.startTime >= block.endTime) {
        return 0;
    }
    const start =
        Number(block.startTime.slice(0, 2)) * 60 + Number(block.startTime.slice(3, 5));
    const end =
        Number(block.endTime.slice(0, 2)) * 60 + Number(block.endTime.slice(3, 5));
    return end > start ? end - start : 0;
};

/** Validates that blocks are well-formed and non-overlapping on each weekday. */
const blockProblems = (blocks: ScheduleBlock[]): string[] => {
    const problems: string[] = [];
    const byWeekday = new Map<number, ScheduleBlock[]>();

    for (const block of blocks) {
        if (!block.startTime || !block.endTime) {
            problems.push(
                `${WEEKDAY_NAMES[block.weekday]}: Start and end times are required.`
            );
            continue;
        }
        if (block.startTime >= block.endTime) {
            problems.push(
                `${WEEKDAY_NAMES[block.weekday]}: End time (${block.endTime}) must be later than start time (${block.startTime}).`
            );
        }

        const list = byWeekday.get(block.weekday) ?? [];
        list.push(block);
        byWeekday.set(block.weekday, list);
    }

    for (const [weekday, list] of byWeekday) {
        const sorted = [...list].sort((a, b) => a.startTime.localeCompare(b.startTime));
        for (let i = 1; i < sorted.length; i += 1) {
            if (sorted[i]!.startTime < sorted[i - 1]!.endTime) {
                problems.push(
                    `${WEEKDAY_NAMES[weekday]}: Working periods must not overlap (${sorted[i - 1]!.startTime}–${sorted[i - 1]!.endTime} and ${sorted[i]!.startTime}–${sorted[i]!.endTime}).`
                );
                break;
            }
        }
    }

    return problems;
};

export interface StaffScheduleProps {
    staffId: number;
    staffName: string;
    onSaved: (message: string) => void | Promise<void>;
    onDirtyChange?: (isDirty: boolean) => void;
    onStatsChange?: (stats: {
        workingDays: number;
        totalMinutes: number;
        avgDailyMinutes: number;
    }) => void;
}

export function StaffSchedule(props: StaffScheduleProps) {
    const { staffId, staffName, onSaved, onDirtyChange, onStatsChange } = props;
    const [initialBlocks, setInitialBlocks] = useState<ScheduleBlock[]>([]);
    const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let stale = false;
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get<{ data: StaffScheduleRow[] }>(
                    `/owner/staff/${staffId}/schedules`
                );
                if (!stale) {
                    const loaded = toBlocks(res.data.data);
                    setInitialBlocks(loaded);
                    setBlocks(loaded);
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
        const sortedCurrent = [...blocks].sort((a, b) =>
            a.weekday === b.weekday
                ? a.startTime.localeCompare(b.startTime)
                : a.weekday - b.weekday
        );
        const sortedInitial = [...initialBlocks].sort((a, b) =>
            a.weekday === b.weekday
                ? a.startTime.localeCompare(b.startTime)
                : a.weekday - b.weekday
        );
        return JSON.stringify(sortedCurrent) !== JSON.stringify(sortedInitial);
    }, [blocks, initialBlocks]);

    const onDirtyChangeRef = useRef(onDirtyChange);
    useEffect(() => {
        onDirtyChangeRef.current = onDirtyChange;
    }, [onDirtyChange]);

    const onStatsChangeRef = useRef(onStatsChange);
    useEffect(() => {
        onStatsChangeRef.current = onStatsChange;
    }, [onStatsChange]);

    useEffect(() => {
        onDirtyChangeRef.current?.(isDirty);
    }, [isDirty]);

    // Calculate schedule stats
    const problems = useMemo(() => blockProblems(blocks), [blocks]);
    const validBlocks = useMemo(
        () => blocks.filter((b) => b.startTime && b.endTime && b.startTime < b.endTime),
        [blocks]
    );

    const workingDays = useMemo(
        () => new Set(validBlocks.map((b) => b.weekday)).size,
        [validBlocks]
    );

    const totalMinutes = useMemo(
        () => validBlocks.reduce((sum, block) => sum + blockMinutes(block), 0),
        [validBlocks]
    );

    const avgDailyMinutes = useMemo(
        () => (workingDays > 0 ? Math.round(totalMinutes / workingDays) : 0),
        [workingDays, totalMinutes]
    );

    useEffect(() => {
        onStatsChangeRef.current?.({ workingDays, totalMinutes, avgDailyMinutes });
    }, [workingDays, totalMinutes, avgDailyMinutes]);

    const updateBlock = (targetIndex: number, patch: Partial<ScheduleBlock>) => {
        setBlocks((current) =>
            current.map((block, i) => (i === targetIndex ? { ...block, ...patch } : block))
        );
    };

    const removeBlock = (targetIndex: number) => {
        setBlocks((current) => current.filter((_, i) => i !== targetIndex));
    };

    const clearDay = (weekday: number) => {
        setBlocks((current) => current.filter((b) => b.weekday !== weekday));
    };

    const addPeriod = (weekday: number) => {
        const existing = blocks
            .filter((b) => b.weekday === weekday)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        let startTime = "09:00";
        let endTime = "17:00";

        if (existing.length > 0) {
            const last = existing[existing.length - 1]!;
            const lastEndHour = Number(last.endTime.slice(0, 2));
            const lastEndMinute = Number(last.endTime.slice(3, 5));

            // Default new period to 1 hour after the latest period ends
            const nextStartHour = Math.min(20, lastEndHour + 1);
            const nextEndHour = Math.min(22, nextStartHour + 4);

            startTime = `${String(nextStartHour).padStart(2, "0")}:${String(lastEndMinute).padStart(2, "0")}`;
            endTime = `${String(nextEndHour).padStart(2, "0")}:${String(lastEndMinute).padStart(2, "0")}`;
        }

        setBlocks((current) => [...current, { weekday, startTime, endTime }]);
    };

    const resetChanges = () => {
        setBlocks(initialBlocks);
        toast.info("Working hours reverted to last saved schedule.");
    };

    const save = async () => {
        if (problems.length > 0) {
            toast.error("Please fix schedule validation errors before saving.");
            return;
        }

        // Sort blocks chronologically by weekday, then start time before saving
        const sortedBlocks = [...blocks].sort((a, b) => {
            if (a.weekday !== b.weekday) return a.weekday - b.weekday;
            return a.startTime.localeCompare(b.startTime);
        });

        setBusy(true);
        try {
            const res = await api.put<{ data: StaffScheduleRow[] }>(
                `/owner/staff/${staffId}/schedules`,
                { blocks: sortedBlocks }
            );
            const saved = toBlocks(res.data.data);
            setInitialBlocks(saved);
            setBlocks(saved);
            onDirtyChange?.(false);
            await onSaved(`Working hours updated for ${staffName}.`);
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <Card title="Working Hours">
                <p className="py-6 text-center text-sm text-muted">Loading schedule…</p>
            </Card>
        );
    }

    return (
        <Card
            title="Weekly Working Hours"
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
                        disabled={busy || !isDirty || problems.length > 0}
                        aria-busy={busy}
                        onClick={() => void save()}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary-dark px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-primary-press disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {busy ? "Saving hours…" : "Save working hours"}
                    </button>
                </div>
            }
        >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
                <p className="text-xs text-muted max-w-xl">
                    Configure recurring working days and time intervals for <strong>{staffName}</strong>. Days without working periods are treated as days off.
                </p>
                <div className="text-xs font-medium text-charcoal">
                    {workingDays === 0 ? (
                        <span className="text-muted">No scheduled hours · All days off</span>
                    ) : (
                        <span>
                            <strong>{workingDays}</strong> working {workingDays === 1 ? "day" : "days"} ·{" "}
                            <strong>{formatDuration(totalMinutes)}</strong> / week
                        </span>
                    )}
                </div>
            </div>

            {/* Validation Problems Callout */}
            {problems.length > 0 && (
                <div className="mb-4 rounded-xl border border-danger-line bg-danger-bg p-3 text-xs text-danger">
                    <p className="font-semibold">Please correct the following scheduling conflicts:</p>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                        {problems.map((prob, idx) => (
                            <li key={idx}>{prob}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 7 Days of the Week List */}
            <div className="space-y-2.5">
                {WEEKDAY_NAMES.map((name, weekday) => {
                    // Collect entries for this day with their global indices
                    const dayEntries = blocks
                        .map((block, index) => ({ block, index }))
                        .filter((entry) => entry.block.weekday === weekday)
                        .sort((a, b) => a.block.startTime.localeCompare(b.block.startTime));

                    const dayMinutes = dayEntries.reduce(
                        (sum, { block }) => sum + blockMinutes(block),
                        0
                    );
                    const isDayOff = dayEntries.length === 0;

                    return (
                        <div
                            key={weekday}
                            className={`rounded-xl border transition-colors p-3 ${
                                isDayOff
                                    ? "border-border/60 bg-charcoal/[0.02]"
                                    : "border-border bg-surface hover:border-primary/40"
                            }`}
                        >
                            {/* Day Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`text-sm font-semibold ${
                                            isDayOff ? "text-muted" : "text-charcoal"
                                        }`}
                                    >
                                        {name}
                                    </span>
                                    {isDayOff ? (
                                        <span className="rounded-full bg-charcoal/10 px-2 py-0.5 text-[11px] font-medium text-muted">
                                            Day off
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-primary-light/30 px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                                            {formatDuration(dayMinutes)} ({dayEntries.length} period{dayEntries.length === 1 ? "" : "s"})
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {!isDayOff && (
                                        <button
                                            type="button"
                                            onClick={() => clearDay(weekday)}
                                            className="text-xs text-muted hover:text-danger hover:underline transition-colors px-1"
                                            title={`Remove all working hours on ${name}`}
                                        >
                                            Mark day off
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => addPeriod(weekday)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-charcoal hover:border-primary hover:bg-primary-light/20 transition-colors"
                                    >
                                        <span aria-hidden="true" className="font-bold">+</span>
                                        <span>{isDayOff ? "Add hours" : "Add period"}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Periods List */}
                            {!isDayOff && (
                                <div className="mt-2.5 space-y-2 border-t border-border/60 pt-2.5">
                                    {dayEntries.map(({ block, index }, pIdx) => {
                                        const dur = blockMinutes(block);
                                        const isInvalidRange =
                                            block.startTime &&
                                            block.endTime &&
                                            block.startTime >= block.endTime;

                                        return (
                                            <div
                                                key={index}
                                                className="flex flex-wrap items-center gap-2 text-xs"
                                            >
                                                <span className="w-14 text-muted font-medium">
                                                    Period {pIdx + 1}:
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="time"
                                                        value={block.startTime}
                                                        aria-label={`${name} period ${pIdx + 1} start time`}
                                                        onChange={(e) =>
                                                            updateBlock(index, { startTime: e.target.value })
                                                        }
                                                        className={`rounded-lg border px-2 py-1 text-xs font-medium text-charcoal outline-none transition focus:ring-2 focus:ring-primary/40 ${
                                                            isInvalidRange ? "border-danger bg-danger-bg/40" : "border-border bg-surface"
                                                        }`}
                                                    />
                                                    <span className="text-muted">–</span>
                                                    <input
                                                        type="time"
                                                        value={block.endTime}
                                                        aria-label={`${name} period ${pIdx + 1} end time`}
                                                        onChange={(e) =>
                                                            updateBlock(index, { endTime: e.target.value })
                                                        }
                                                        className={`rounded-lg border px-2 py-1 text-xs font-medium text-charcoal outline-none transition focus:ring-2 focus:ring-primary/40 ${
                                                            isInvalidRange ? "border-danger bg-danger-bg/40" : "border-border bg-surface"
                                                        }`}
                                                    />
                                                </div>

                                                <span className="text-muted font-medium">
                                                    {dur > 0 ? `(${formatDuration(dur)})` : isInvalidRange ? "(Invalid range)" : ""}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => removeBlock(index)}
                                                    aria-label={`Remove period ${pIdx + 1} on ${name}`}
                                                    title="Remove period"
                                                    className="ml-auto grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-danger-bg hover:text-danger transition-colors text-sm"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom Save Bar */}
            <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-3">
                <span className="text-xs text-muted">
                    {isDirty ? "You have unsaved schedule changes." : "Schedule is up to date."}
                </span>
                <button
                    type="button"
                    disabled={busy || !isDirty || problems.length > 0}
                    aria-busy={busy}
                    onClick={() => void save()}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary-dark px-4 py-2 text-xs font-medium text-white shadow-xs transition-colors hover:bg-primary-press disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {busy ? "Saving hours…" : "Save working hours"}
                </button>
            </div>
        </Card>
    );
}
