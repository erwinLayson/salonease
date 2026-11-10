const pad = (value: number): string => String(value).padStart(2, "0");

/** `YYYY-MM-DD` for today + N days. */
export const dateInDays = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Formats a date-time string as a short local date + time. */
export const formatDateTime = (value: string): string =>
    new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
        hour12: true,
    });

/** 12-hour clock time (e.g. `2:30 PM`) for a date-time string. */
export const formatClock = (value: string): string => {
    const date = new Date(value);
    const hour = date.getHours();
    const suffix = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:${pad(date.getMinutes())} ${suffix}`;
};

export const peso = (amount: number): string => `₱${amount.toFixed(2)}`;

export const WEEKDAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** `09:00` -> `9:00 AM` (12-hour clock). */
export const formatClock12 = (time: string): string => {
    const [hh = "0", mm = "0"] = time.split(":");
    const hour = Number(hh);
    const suffix = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:${mm.padStart(2, "0")} ${suffix}`;
};

/**
 * Collapses weekly working hours into a compact label for staff cards, e.g.
 * `Mon–Sat 9:00 AM–6:00 PM` or `Every day 9:00 AM–6:00 PM`.
 * Returns `null` when the staff member has no hours set.
 */
export const formatScheduleLabel = (
    schedule: Array<{ weekday: number; startTime: string; endTime: string }>
): string | null => {
    if (schedule.length === 0) {
        return null;
    }

    const sorted = [...schedule].sort((a, b) => a.weekday - b.weekday);
    const groups: Array<{ days: number[]; start: string; end: string }> = [];

    for (const row of sorted) {
        const last = groups[groups.length - 1];
        const continues =
            last !== undefined &&
            last.start === row.startTime &&
            last.end === row.endTime &&
            row.weekday === last.days[last.days.length - 1] + 1;

        if (continues && last !== undefined) {
            last.days.push(row.weekday);
        } else {
            groups.push({ days: [row.weekday], start: row.startTime, end: row.endTime });
        }
    }

    return groups
        .map((group) => {
            const span =
                group.days.length === 7
                    ? "Every day"
                    : group.days.length === 1
                      ? DAY_SHORT[group.days[0]]
                      : `${DAY_SHORT[group.days[0]]}–${DAY_SHORT[group.days[group.days.length - 1]]}`;
            return `${span} ${formatClock12(group.start)}–${formatClock12(group.end)}`;
        })
        .join(", ");
};

/** Formats minutes into hours and minutes display (e.g. "8 hrs" or "7h 30m"). */
export const formatDuration = (minutes: number): string => {
    if (minutes <= 0) return "0 hrs";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} ${h === 1 ? "hr" : "hrs"}`;
    if (h === 0) return `${m} min`;
    return `${h}h ${m}m`;
};
