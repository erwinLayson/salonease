import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { WEEKDAY_NAMES } from "../../lib/utils";

import type { ScheduleBlock, StaffScheduleRow } from "../../types";

/** "HH:mm:ss" -> "HH:mm" for time inputs. */
const toTimeInput = (value: string): string => value.slice(0, 5);

const toBlocks = (rows: StaffScheduleRow[]): ScheduleBlock[] =>
    rows.map((row) => ({
        weekday: row.weekday,
        startTime: toTimeInput(row.start_time),
        endTime: toTimeInput(row.end_time),
    }));

/** Total minutes of a well-formed block (0 for partial or invalid input). */
const blockMinutes = (block: ScheduleBlock): number => {
    if (block.startTime.length < 5 || block.endTime.length < 5) {
        return 0;
    }
    const start =
        Number(block.startTime.slice(0, 2)) * 60 + Number(block.startTime.slice(3, 5));
    const end =
        Number(block.endTime.slice(0, 2)) * 60 + Number(block.endTime.slice(3, 5));
    return end > start ? end - start : 0;
};

/** Mirrors the server's block validation (well-formed, non-overlapping). */
const blockProblems = (blocks: ScheduleBlock[]): string[] => {
    const problems: string[] = [];
    const byWeekday = new Map<number, ScheduleBlock[]>();

    for (const block of blocks) {
        if (block.startTime === "" || block.endTime === "" || block.startTime >= block.endTime) {
            problems.push(
                `${WEEKDAY_NAMES[block.weekday]}: each block must end after it starts.`
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
                problems.push(`${WEEKDAY_NAMES[weekday]}: working hours must not overlap.`);
                break;
            }
        }
    }

    return problems;
};

export function StaffSchedule(props: {
    staffId: number;
    staffName: string;
    onSaved: (message: string) => void | Promise<void>;
}) {
    const { staffId } = props;
    const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get<{ data: StaffScheduleRow[] }>(
                    `/owner/staff/${staffId}/schedules`
                );
                setBlocks(toBlocks(res.data.data));
            } catch {
                // Failures surface as a toast via the axios error interceptor.
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [staffId]);

    const update = (index: number, patch: Partial<ScheduleBlock>) =>
        setBlocks((current) =>
            current.map((block, i) => (i === index ? { ...block, ...patch } : block))
        );

    const remove = (index: number) =>
        setBlocks((current) => current.filter((_, i) => i !== index));

    const add = (weekday: number) =>
        setBlocks((current) => [
            ...current,
            { weekday, startTime: "09:00", endTime: "18:00" },
        ]);

    const save = async () => {
        setBusy(true);
        try {
            const res = await api.put<{ data: StaffScheduleRow[] }>(
                `/owner/staff/${staffId}/schedules`,
                { blocks }
            );
            setBlocks(toBlocks(res.data.data));
            await props.onSaved(`Working hours updated for ${props.staffName}.`);
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <Card title="Working hours">
                <p className="text-sm text-muted">Loading…</p>
            </Card>
        );
    }

    const problems = blockProblems(blocks);
    const workingDays = new Set(blocks.map((block) => block.weekday)).size;
    const totalMinutes = blocks.reduce((sum, block) => sum + blockMinutes(block), 0);
    const weekTotal =
        totalMinutes === 0
            ? "No hours set"
            : [
                  Math.floor(totalMinutes / 60) > 0
                      ? `${Math.floor(totalMinutes / 60)} hr`
                      : "",
                  totalMinutes % 60 > 0 ? `${totalMinutes % 60} min` : "",
              ]
                  .filter(Boolean)
                  .join(" ");

    return (
        <Card title="Working hours">
            <div className="mb-4">
                <p className="text-sm text-muted">
                    Regular weekly hours for {props.staffName}. Days without hours are
                    treated as days off.
                </p>
                <p className="mt-1 text-xs font-medium text-charcoal">
                    {workingDays === 0
                        ? "No hours set — all days are days off."
                        : `${workingDays} working ${workingDays === 1 ? "day" : "days"} · ${weekTotal} per week`}
                </p>
            </div>

            <ul className="grid gap-3">
                {WEEKDAY_NAMES.map((name, weekday) => {
                    const dayBlocks = blocks
                        .map((block, index) => ({ block, index }))
                        .filter((entry) => entry.block.weekday === weekday)
                        .sort((a, b) => a.block.startTime.localeCompare(b.block.startTime));

                    return (
                        <li
                            key={weekday}
                            className={`rounded-xl border border-border p-3 ${
                                dayBlocks.length === 0 ? "bg-charcoal/5" : "bg-surface"
                            }`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm font-medium">{name}</span>
                                <div className="flex items-center gap-2">
                                    {dayBlocks.length === 0 && (
                                        <span className="rounded-full bg-charcoal/10 px-2 py-0.5 text-[11px] font-medium text-muted">
                                            Day off
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => add(weekday)}
                                        className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium transition-colors hover:border-primary hover:bg-primary-light/30"
                                    >
                                        <span aria-hidden>+</span> Add hours
                                    </button>
                                </div>
                            </div>

                            {dayBlocks.length > 0 && (
                                <ul className="mt-2 space-y-2">
                                    {dayBlocks.map(({ block, index }) => (
                                        <li
                                            key={index}
                                            className="flex flex-wrap items-center gap-2"
                                        >
                                            <input
                                                type="time"
                                                value={block.startTime}
                                                aria-label={`${name} start time`}
                                                onChange={(event) =>
                                                    update(index, {
                                                        startTime: event.target.value,
                                                    })
                                                }
                                                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                                            />
                                            <span
                                                aria-hidden
                                                className="text-sm text-muted"
                                            >
                                                –
                                            </span>
                                            <input
                                                type="time"
                                                value={block.endTime}
                                                aria-label={`${name} end time`}
                                                onChange={(event) =>
                                                    update(index, {
                                                        endTime: event.target.value,
                                                    })
                                                }
                                                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                aria-label={`Remove ${name} hours`}
                                                className="grid min-h-11 min-w-11 place-items-center rounded-md text-sm text-muted transition-colors hover:bg-danger-bg hover:text-danger"
                                            >
                                                ✕
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    );
                })}
            </ul>

            {problems.length > 0 && (
                <ul className="mt-3 rounded-lg border border-danger-line bg-danger-bg px-3 py-2">
                    {problems.map((problem) => (
                        <li
                            key={problem}
                            className="flex items-start gap-1.5 text-xs font-medium text-danger"
                        >
                            <span aria-hidden className="mt-0.5">
                                !
                            </span>
                            {problem}
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-4 flex justify-end">
                <button
                    type="button"
                    disabled={busy || problems.length > 0}
                    aria-busy={busy}
                    onClick={() => void save()}
                    className="min-h-11 rounded-lg bg-primary-dark px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-press disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {busy ? "Saving…" : "Save hours"}
                </button>
            </div>
        </Card>
    );
}
