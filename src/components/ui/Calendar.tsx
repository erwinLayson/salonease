const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Colour-coded meaning of a day, used by schedule calendars. */
export type CalendarDayStatus = "working" | "off" | "leave" | "closure";

/** Whole-cell tint for each day status. */
const STATUS_CELL: Record<CalendarDayStatus, string> = {
    working: "bg-success-bg",
    off: "bg-charcoal/10",
    leave: "bg-warning-bg",
    closure: "bg-danger-bg",
};

const STATUS_LABELS: Record<CalendarDayStatus, string> = {
    working: "Working",
    off: "Day off",
    leave: "Leave",
    closure: "Closed",
};

/** Same palette, tuned to stay legible on the dark tooltip surface. */
const STATUS_DOTS: Record<CalendarDayStatus, string> = {
    working: "bg-success",
    off: "bg-white/70",
    leave: "bg-warning",
    closure: "bg-danger",
};

const STATUS_ORDER: CalendarDayStatus[] = ["working", "off", "leave", "closure"];

const pad2 = (value: number): string => String(value).padStart(2, "0");

/** `YYYY-MM-DD` -> local Date (numbers, so no UTC shift). Invalid input falls back to today. */
const toDate = (value: string): Date => {
    const parts = value.split("-");
    if (parts.length !== 3) {
        return new Date();
    }
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return new Date();
    }
    return new Date(year, month - 1, day);
};

const toKey = (date: Date): string =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/**
 * Inline month-grid date picker. The viewed month is controlled by the parent
 * (`month` + `onMonthChange`, both `YYYY-MM`), so the parent can react to month
 * navigation — loading availability counts, for example. Days before `min` are
 * disabled, today is ringed, and the picked date is reported as `YYYY-MM-DD`.
 *
 * Indicators:
 * - `available` (`YYYY-MM-DD` -> open-slot count): days with open times get a
 *   dot and days without any are disabled (guest booking flow).
 * - `marks` (`YYYY-MM-DD` -> count): days get a small count badge and stay
 *   clickable (staff calendar showing appointments per day).
 * - `status` (`YYYY-MM-DD` -> status): days get a tinted cell background
 *   and a legend below the grid (owner/staff schedule: working, day off,
 *   leave, closure).
 */
export function Calendar(props: {
    value: string;
    onChange: (value: string) => void;
    /** Viewed month as `YYYY-MM` (controlled). */
    month: string;
    onMonthChange: (month: string) => void;
    min?: string;
    available?: Record<string, number> | null;
    marks?: Record<string, number> | null;
    status?: Record<string, CalendarDayStatus> | null;
    /**
     * Per-day status counts (`YYYY-MM-DD` -> status -> count) for the hover
     * breakdown, e.g. how many staff are working/on leave on each day.
     */
    statusBreakdown?: Record<string, Partial<Record<CalendarDayStatus, number>>> | null;
    /** Render the status legend below the grid (default true). */
    showLegend?: boolean;
}) {
    const year = Number(props.month.slice(0, 4));
    const monthIndex = Number(props.month.slice(5, 7)) - 1;

    const selectedDate = toDate(props.value);
    const selectedKey = props.value;
    const todayKey = toKey(new Date());
    const hasAvailability = props.available != null;
    const hasMarks = props.marks != null;
    const hasStatus = props.status != null;
    const monthHasOpenDays = hasAvailability && Object.keys(props.available ?? {}).length > 0;
    const monthHasMarks = hasMarks && Object.keys(props.marks ?? {}).length > 0;
    const monthHasStatus = hasStatus && Object.keys(props.status ?? {}).length > 0;

    const shiftMonth = (delta: number) => {
        const next = new Date(year, monthIndex + delta, 1);
        props.onMonthChange(`${next.getFullYear()}-${pad2(next.getMonth() + 1)}`);
    };

    const cells: (number | null)[] = [];
    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    for (let i = 0; i < firstWeekday; i += 1) {
        cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        cells.push(day);
    }

    return (
        <div className="w-full rounded-xl border border-border bg-surface p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={() => shiftMonth(-1)}
                    aria-label="Previous month"
                    className="grid min-h-11 min-w-11 place-items-center rounded-lg text-lg text-charcoal transition-colors hover:bg-charcoal/5"
                >
                    <span aria-hidden>‹</span>
                </button>
                <p className="text-sm font-semibold text-charcoal" aria-live="polite">
                    {MONTHS[monthIndex]} {year}
                </p>
                <button
                    type="button"
                    onClick={() => shiftMonth(1)}
                    aria-label="Next month"
                    className="grid min-h-11 min-w-11 place-items-center rounded-lg text-lg text-charcoal transition-colors hover:bg-charcoal/5"
                >
                    <span aria-hidden>›</span>
                </button>
            </div>

            <div
                className="mb-1 grid grid-cols-7 gap-1"
                aria-hidden
            >
                {WEEKDAYS.map((weekday) => (
                    <span
                        key={weekday}
                        className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted"
                    >
                        {weekday}
                    </span>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {cells.map((day, index) => {
                    if (day === null) {
                        return <span key={`blank-${index}`} aria-hidden />;
                    }
                    const key = `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
                    const openCount = props.available?.[key] ?? 0;
                    const markCount = props.marks?.[key] ?? 0;
                    const status = props.status?.[key] ?? null;
                    const breakdown = props.statusBreakdown?.[key] ?? null;
                    const breakdownStatuses = breakdown
                        ? STATUS_ORDER.filter((kind) => (breakdown[kind] ?? 0) > 0)
                        : [];
                    const hasTooltip = status !== null || hasMarks || hasAvailability;
                    const noSlots = hasAvailability && openCount === 0;
                    const disabled = (props.min !== undefined && key < props.min) || noSlots;
                    const isSelected = key === selectedKey;
                    const isToday = key === todayKey;

                    const ariaSuffix =
                        (hasMarks
                            ? markCount > 0
                                ? `, ${markCount} appointment${markCount === 1 ? "" : "s"}`
                                : ", no appointments"
                            : hasAvailability
                              ? openCount > 0
                                  ? ", has open times"
                                  : ", no times available"
                              : "") + (status ? `, ${STATUS_LABELS[status]}` : "");

                    return (
                        <div key={key} className="group relative">
                            <button
                                type="button"
                                disabled={disabled}
                                aria-label={`${MONTHS[monthIndex]} ${day}, ${year}${ariaSuffix}`}
                                aria-pressed={isSelected}
                                aria-current={isToday ? "date" : undefined}
                                onClick={() => props.onChange(key)}
                                className={`relative grid h-11 w-full place-items-center rounded-lg text-sm transition ${
                                    isSelected
                                        ? "bg-primary-dark font-medium text-white shadow-sm"
                                        : disabled
                                          ? "cursor-not-allowed text-muted/50"
                                          : status
                                            ? `${STATUS_CELL[status]} ${
                                                  isToday
                                                      ? "font-semibold text-primary-dark ring-1 ring-primary"
                                                      : "text-charcoal"
                                              } hover:brightness-95`
                                            : `hover:bg-primary-light/50 ${
                                                  isToday
                                                      ? "font-semibold text-primary-dark ring-1 ring-primary"
                                                      : "text-charcoal"
                                              }`
                                }`}
                            >
                                <span className="flex flex-col items-center leading-none">
                                    {day}
                                    {hasMarks && markCount > 0 && (
                                        <span
                                            aria-hidden
                                            className={`mt-0.5 rounded-full px-1.5 text-[10px] font-medium leading-4 ${
                                                isSelected
                                                    ? "bg-white/90 text-primary-dark"
                                                    : "bg-primary-light text-primary-dark"
                                            }`}
                                        >
                                            {markCount}
                                        </span>
                                    )}
                                    {!hasMarks && hasAvailability && openCount > 0 && (
                                        <span
                                            aria-hidden
                                            className="mt-0.5 h-1 w-1 rounded-full bg-primary"
                                        />
                                    )}
                                </span>
                            </button>

                            {hasTooltip && (
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 hidden w-max max-w-[13rem] -translate-x-1/2 rounded-lg border border-border bg-charcoal px-3 py-2 text-left text-xs text-white shadow-lift group-hover:block"
                                >
                                    <p className="font-semibold">
                                        {MONTHS[monthIndex]} {day}, {year}
                                    </p>
                                    <ul className="mt-1 grid gap-0.5">
                                        {breakdown
                                            ? breakdownStatuses.map((kind) => (
                                                  <li
                                                      key={kind}
                                                      className="flex items-center gap-1.5"
                                                  >
                                                      <span
                                                          className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOTS[kind]}`}
                                                      />
                                                      {STATUS_LABELS[kind]}: {breakdown[kind] ?? 0}
                                                  </li>
                                              ))
                                            : status && (
                                                  <li className="flex items-center gap-1.5">
                                                      <span
                                                          className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status]}`}
                                                      />
                                                      {STATUS_LABELS[status]}
                                                  </li>
                                              )}
                                        {hasMarks && (
                                            <li>
                                                {markCount} appointment
                                                {markCount === 1 ? "" : "s"}
                                            </li>
                                        )}
                                        {!hasMarks && hasAvailability && (
                                            <li>
                                                {openCount > 0
                                                    ? `${openCount} open times`
                                                    : "No times available"}
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {hasMarks && (
                <p className="mt-2 text-xs text-muted">
                    {monthHasMarks
                        ? "Badged days show how many appointments you have; tap a day to see them."
                        : `No appointments in ${MONTHS[monthIndex]} ${year}.`}
                </p>
            )}

            {hasStatus && props.showLegend !== false && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    {monthHasStatus ? (
                        STATUS_ORDER.map((kind) => (
                            <span key={kind} className="flex items-center gap-1.5">
                                <span
                                    aria-hidden
                                    className={`inline-block h-2.5 w-2.5 rounded-[3px] ${STATUS_CELL[kind]}`}
                                />
                                {STATUS_LABELS[kind]}
                            </span>
                        ))
                    ) : (
                        <span>{`No schedule in ${MONTHS[monthIndex]} ${year}.`}</span>
                    )}
                </div>
            )}

            {hasAvailability && (
                <p className="mt-2 text-xs text-muted">
                    {monthHasOpenDays ? (
                        <span className="flex items-center gap-1.5">
                            <span
                                aria-hidden
                                className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
                            />
                            Days marked with a dot have open times; dimmed days are fully
                            booked.
                        </span>
                    ) : (
                        `No availability in ${MONTHS[monthIndex]} ${year}.`
                    )}
                </p>
            )}

            <p className="mt-3 border-t border-border pt-2 text-xs text-muted">
                Selected:{" "}
                <span className="font-medium text-charcoal">
                    {selectedDate.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                    })}
                </span>
            </p>
        </div>
    );
}
