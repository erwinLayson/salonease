import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { toast } from "../../lib/toast";
import { dateInDays } from "../../lib/utils";

// UI components
import { Calendar } from "../ui/Calendar";
import { Field } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

// Types
import type { CalendarDayStatus } from "../ui/Calendar";
import type { LeaveCoverage } from "../../types";

const pad = (value: number): string => String(value).padStart(2, "0");

/** `YYYY-MM-DD` of `dateKey` shifted by `days - 1` (inclusive counting). */
const addDaysTo = (dateKey: string, days: number): string => {
    const date = new Date(`${dateKey}T00:00:00`);
    date.setDate(date.getDate() + days - 1);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** The `YYYY-MM-DD` after a date key. */
const nextDayOf = (dateKey: string): string => addDaysTo(dateKey, 2);

/** The last `YYYY-MM-DD` of a `YYYY-MM` month. */
const lastDayOf = (month: string): string => {
    const year = Number(month.slice(0, 4));
    const monthIndex = Number(month.slice(5, 7)) - 1;
    const last = new Date(year, monthIndex + 1, 0).getDate();
    return `${month}-${pad(last)}`;
};

/** `2026-10-03` -> `Saturday, October 3, 2026`. */
const formatFullDate = (key: string): string => {
    const [year = "0", month = "1", day = "1"] = key.split("-");
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
        undefined,
        { weekday: "long", month: "long", day: "numeric", year: "numeric" }
    );
};

/**
 * Staff leave request: a details step (dates + optional reason) followed by
 * a review step before submitting. The first day is picked on a month
 * calendar that tints every day already covered by leave — the caller's or a
 * colleague's, pending or approved — so dates can be timed around the rest
 * of the team. The request lands as `pending` and does not change the
 * schedule until the owner approves it.
 */
export function RequestLeaveModal(props: {
    onClose: () => void;
    /** The request was submitted — parent reloads its list. */
    onCreated: () => void;
    /** Prefill the first day (e.g. the calendar's selected date). */
    defaultStart?: string;
}) {
    const today = dateInDays(0);
    // The selected date when it is still bookable, otherwise tomorrow.
    const initialStart =
        props.defaultStart && props.defaultStart >= today
            ? props.defaultStart
            : dateInDays(1);
    const [step, setStep] = useState<"details" | "review">("details");
    const [startDate, setStartDate] = useState(initialStart);
    const [month, setMonth] = useState(initialStart.slice(0, 7));
    const [mode, setMode] = useState<"days" | "endDate">("days");
    const [dayCount, setDayCount] = useState("1");
    const [endDate, setEndDate] = useState(initialStart);
    const [reason, setReason] = useState("");
    const [coverage, setCoverage] = useState<LeaveCoverage[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const parsedDays = Number(dayCount);
    const dayCountValid =
        mode === "endDate" ||
        (Number.isInteger(parsedDays) && parsedDays >= 1 && dayCount.trim() !== "");
    const endKey =
        mode === "days" && dayCountValid ? addDaysTo(startDate, parsedDays) : endDate;

    // Whose leave overlaps the viewed month — reloaded on month navigation.
    useEffect(() => {
        let stale = false;
        const load = async () => {
            try {
                const res = await api.get<{ data: LeaveCoverage[] }>(
                    "/staff/leave-requests/coverage",
                    { params: { from: `${month}-01`, to: lastDayOf(month) } }
                );
                if (!stale) {
                    setCoverage(res.data.data);
                }
            } catch {
                // The calendar still works without the overlay; failures
                // surface as a toast via the axios error interceptor.
            }
        };
        void load();
        return () => {
            stale = true;
        };
    }, [month]);

    // Amber tints + a per-day "how many staff are off" count for the tooltip.
    const { statusMap, breakdown } = useMemo(() => {
        const statuses: Record<string, CalendarDayStatus> = {};
        const staffByDay = new Map<string, Set<number>>();
        const monthStart = `${month}-01`;
        const monthEnd = lastDayOf(month);

        for (const entry of coverage) {
            // Clamp each request to the viewed month, day by day.
            let day = entry.startDate < monthStart ? monthStart : entry.startDate;
            const last = entry.endDate > monthEnd ? monthEnd : entry.endDate;

            while (day <= last) {
                statuses[day] = "leave";
                let ids = staffByDay.get(day);
                if (!ids) {
                    ids = new Set<number>();
                    staffByDay.set(day, ids);
                }
                ids.add(entry.staffId);
                day = nextDayOf(day);
            }
        }

        const counts: Record<string, Partial<Record<CalendarDayStatus, number>>> = {};
        for (const [day, ids] of staffByDay) {
            counts[day] = { leave: ids.size };
        }

        return { statusMap: statuses, breakdown: counts };
    }, [coverage, month]);

    const change = (apply: () => void) => {
        apply();
        setError(null);
    };

    /** Validates the details step; true when it is safe to review. */
    const validate = (): boolean => {
        if (!startDate) {
            setError("Pick the first day of your leave.");
            return false;
        }
        if (startDate < today) {
            setError("Leave dates cannot be in the past.");
            return false;
        }
        if (mode === "days" && !dayCountValid) {
            setError("Enter a whole number of days, at least 1.");
            return false;
        }
        if (mode === "endDate") {
            if (!endDate) {
                setError("Pick the last day of your leave.");
                return false;
            }
            if (endDate < startDate) {
                setError("The last day must be on or after the first day.");
                return false;
            }
        }
        return true;
    };

    const submit = async (): Promise<void> => {
        setBusy(true);
        setError(null);
        try {
            const trimmed = reason.trim();
            await api.post(
                "/staff/leave-requests",
                {
                    startDate,
                    endDate: endKey,
                    ...(trimmed ? { reason: trimmed } : {}),
                },
                { skipErrorToast: true }
            );
            toast.success("Leave request submitted — waiting for approval.");
            props.onCreated();
            props.onClose();
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const dayLabel = String(
        Math.max(
            1,
            Math.round(
                (new Date(`${endKey}T00:00:00`).getTime() -
                    new Date(`${startDate}T00:00:00`).getTime()) /
                    86_400_000
            ) + 1
        )
    );

    return (
        <Modal
            title={step === "details" ? "Request leave" : "Review your request"}
            onClose={props.onClose}
            wide
        >
            {step === "details" ? (
                <div>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
                        <div>
                            <Calendar
                                value={startDate}
                                onChange={(value) =>
                                    change(() => {
                                        setStartDate(value);
                                        setMonth(value.slice(0, 7));
                                    })
                                }
                                month={month}
                                onMonthChange={setMonth}
                                min={today}
                                status={statusMap}
                                statusBreakdown={breakdown}
                                showLegend={false}
                            />
                            <p className="mt-2 flex items-start gap-2 text-xs text-muted">
                                <span
                                    aria-hidden
                                    className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-[3px] bg-warning-bg ring-1 ring-warning/50"
                                />
                                Amber days already have leave — yours or a colleague's,
                                pending or approved. Pick dates that keep enough staff on
                                shift.
                            </p>
                        </div>

                        <div>
                            <Select
                                label="Length"
                                value={mode}
                                onChange={(value) =>
                                    change(() => setMode(value as "days" | "endDate"))
                                }
                                options={[
                                    { value: "days", label: "Number of days" },
                                    { value: "endDate", label: "Until a date" },
                                ]}
                            />

                            {mode === "days" ? (
                                <div className="mt-3 grid gap-3">
                                    <Field
                                        label="Days"
                                        value={dayCount}
                                        onChange={(value) => change(() => setDayCount(value))}
                                        type="number"
                                        placeholder="e.g. 3"
                                    />
                                    <p className="rounded-lg bg-charcoal/5 px-3 py-2.5 text-sm text-charcoal">
                                        {dayCountValid && startDate
                                            ? `Ends on ${formatFullDate(endKey)}`
                                            : "The last day is calculated from the number of days."}
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-3">
                                    <Field
                                        label="Last day"
                                        value={endDate}
                                        onChange={(value) => change(() => setEndDate(value))}
                                        type="date"
                                    />
                                </div>
                            )}

                            <div className="mt-3">
                                <Field
                                    label="Reason (optional)"
                                    value={reason}
                                    onChange={(value) => change(() => setReason(value))}
                                    placeholder="e.g. Family matter, travel, rest"
                                />
                            </div>

                            <p className="mt-2 text-xs text-muted">
                                Your schedule does not change until the owner approves the
                                request. You can withdraw a pending request at any time.
                            </p>
                        </div>
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

                    <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
                        <button
                            type="button"
                            onClick={props.onClose}
                            className="min-h-11 rounded-lg border border-border px-4 text-sm transition-colors hover:bg-charcoal/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (validate()) {
                                    setStep("review");
                                }
                            }}
                            className="min-h-11 rounded-lg bg-primary-dark px-4 text-sm font-medium text-white transition-colors hover:bg-primary-press"
                        >
                            Review request
                        </button>
                    </div>
                </div>
            ) : (
                <div>
                    <dl className="grid gap-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                                Dates
                            </dt>
                            <dd className="mt-0.5">
                                {formatFullDate(startDate)} → {formatFullDate(endKey)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                                Length
                            </dt>
                            <dd className="mt-0.5">
                                {dayLabel} day{dayLabel === "1" ? "" : "s"}
                            </dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                                Reason
                            </dt>
                            <dd className="mt-0.5">{reason.trim() || "No reason given"}</dd>
                        </div>
                    </dl>

                    <p className="mt-3 rounded-lg bg-charcoal/5 p-3 text-xs leading-relaxed text-charcoal">
                        This is sent to the owner as <strong>Pending</strong>. Your
                        working hours stay as they are until it is approved — approved
                        leave then blocks bookings for these dates.
                    </p>

                    <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => setStep("details")}
                            className="min-h-11 rounded-lg border border-border px-4 text-sm transition-colors hover:bg-charcoal/5 disabled:opacity-40"
                        >
                            ← Back
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            aria-busy={busy}
                            onClick={() => void submit()}
                            className="min-h-11 rounded-lg bg-primary-dark px-4 text-sm font-medium text-white transition-colors hover:bg-primary-press disabled:opacity-40"
                        >
                            {busy ? "Submitting…" : "Submit request"}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
