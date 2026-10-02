import { useCallback, useEffect, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { api } from "../../lib/api";
import { peso } from "../../lib/utils";

import { Card } from "../../components/ui/Card";
import { Select } from "../../components/ui/Select";

import type { YearlyReport } from "../../types";

const MONTH_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

const PRIMARY = "#C95F78";
const CHARCOAL = "#242326";
const MUTED = "#6E6B6F";
const BORDER = "#E5E1E2";

interface TooltipEntry {
    name?: string;
    dataKey?: string;
    value?: number;
}

/** Dark tooltip matching the calendar's tooltip surface. */
function ReportTooltip(props: {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
}) {
    if (!props.active || !props.payload || props.payload.length === 0) {
        return null;
    }
    return (
        <div className="rounded-lg border border-border bg-charcoal px-3 py-2 text-xs text-white shadow-lift">
            {props.label && <p className="mb-1 font-semibold">{props.label}</p>}
            {props.payload.map((entry) => (
                <p key={String(entry.dataKey)}>
                    {entry.name}:{" "}
                    <strong>
                        {entry.dataKey === "revenue"
                            ? peso(entry.value ?? 0)
                            : entry.value ?? 0}
                    </strong>
                </p>
            ))}
        </div>
    );
}

/** Chart-friendly row for the monthly revenue chart. */
interface MonthPoint {
    label: string;
    revenue: number;
    bookings: number;
}

export default function ReportsPage() {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(String(currentYear));

    const [report, setReport] = useState<YearlyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await api.get<{ data: YearlyReport }>(
                "/owner/reports/yearly",
                { params: { year } }
            );
            setReport(res.data.data);
        } catch {
            // Failures surface as a toast via the axios error interceptor.
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [year]);

    useEffect(() => {
        // Defer to a microtask so the effect body stays synchronous-free.
        void Promise.resolve().then(reload);
    }, [reload]);

    const monthData: MonthPoint[] = (report?.months ?? []).map((row) => ({
        label: MONTH_SHORT[row.month - 1],
        revenue: row.revenue,
        bookings: row.bookings,
    }));

    const topServices = report?.topServices ?? [];
    const hasData = (report?.totalBookings ?? 0) > 0;

    // Offer the current year, the last few years and any year
    // that has data, so an owner can compare against a quieter
    // year even when it has no transactions.
    const recentYears = Array.from(
        { length: 5 },
        (_, index) => currentYear - index
    );
    const yearOptions = [
        ...new Set([...recentYears, ...(report?.years ?? [])]),
    ]
        .sort((a, b) => b - a)
        .map((value) => ({ value: String(value), label: String(value) }));

    const topService = topServices[0];

    return (
        <div className="grid gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        Reports
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                        Yearly income trends and your most booked services.
                    </p>
                </div>
                <div className="w-40">
                    <Select
                        label="Year"
                        value={year}
                        onChange={setYear}
                        options={yearOptions}
                    />
                </div>
            </header>

            {loading && !report && (
                <p className="py-4 text-center text-sm text-muted">
                    Loading report…
                </p>
            )}

            {error && !report && (
                <Card>
                    <div className="py-8 text-center">
                        <p className="text-sm font-medium text-charcoal">
                            Unable to load this report.
                        </p>
                        <p className="mt-1 text-xs text-muted">
                            Please try again.
                        </p>
                        <button
                            type="button"
                            onClick={() => void reload()}
                            className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-charcoal/5"
                        >
                            Retry
                        </button>
                    </div>
                </Card>
            )}

            {report && !hasData && !loading && (
                <Card>
                    <div className="py-10 text-center">
                        <p className="text-sm font-medium text-charcoal">
                            No completed appointments in {report.year}.
                        </p>
                        <p className="mt-1 text-xs text-muted">
                            Reports are based on transactions created when
                            appointments are completed. Try another year.
                        </p>
                    </div>
                </Card>
            )}

            {report && hasData && (
                <>
                    {/* KPI cards */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Card>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Total revenue
                            </p>
                            <p className="mt-1 text-2xl font-bold tracking-tight text-charcoal">
                                {peso(report.totalRevenue)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                                for {report.year}
                            </p>
                        </Card>
                        <Card>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Bookings
                            </p>
                            <p className="mt-1 text-2xl font-bold tracking-tight text-charcoal">
                                {report.totalBookings}
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                                completed appointments
                            </p>
                        </Card>
                        <Card>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Average ticket
                            </p>
                            <p className="mt-1 text-2xl font-bold tracking-tight text-charcoal">
                                {peso(report.averageTicket)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                                per appointment
                            </p>
                        </Card>
                        <Card>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Top service
                            </p>
                            <p className="mt-1 truncate text-2xl font-bold tracking-tight text-charcoal">
                                {topService ? topService.name : "—"}
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                                {topService
                                    ? `${topService.bookings} bookings`
                                    : "no bookings"}
                            </p>
                        </Card>
                    </div>

                    {/* Revenue trend */}
                    <Card title={`Monthly revenue — ${report.year}`}>
                        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted">
                            <span className="inline-flex items-center gap-1.5">
                                <span
                                    aria-hidden
                                    className="h-2.5 w-2.5 rounded-sm"
                                    style={{ background: PRIMARY }}
                                />
                                Revenue
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span
                                    aria-hidden
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ background: CHARCOAL }}
                                />
                                Bookings
                            </span>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={monthData}
                                    margin={{
                                        top: 4,
                                        right: 4,
                                        bottom: 0,
                                        left: 4,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke={BORDER}
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fill: MUTED, fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={{ stroke: BORDER }}
                                    />
                                    <YAxis
                                        yAxisId="revenue"
                                        tick={{ fill: MUTED, fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={64}
                                        tickFormatter={(value: number) =>
                                            `₱${value}`
                                        }
                                    />
                                    <YAxis
                                        yAxisId="bookings"
                                        orientation="right"
                                        tick={{ fill: MUTED, fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={36}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        content={<ReportTooltip />}
                                        cursor={{
                                            fill: "rgba(36,35,38,0.04)",
                                        }}
                                    />
                                    <Bar
                                        yAxisId="revenue"
                                        dataKey="revenue"
                                        name="Revenue"
                                        fill={PRIMARY}
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={36}
                                    />
                                    <Line
                                        yAxisId="bookings"
                                        dataKey="bookings"
                                        name="Bookings"
                                        stroke={CHARCOAL}
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: CHARCOAL }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Top services */}
                    <div className="grid items-start gap-6 lg:grid-cols-2">
                        <Card
                            title="Most booked services"
                            actions={
                                <span className="text-xs text-muted">
                                    by booking frequency
                                </span>
                            }
                        >
                            <div
                                style={{
                                    height: Math.max(
                                        168,
                                        topServices.length * 44
                                    ),
                                }}
                            >
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >
                                    <BarChart
                                        data={topServices}
                                        layout="vertical"
                                        margin={{
                                            top: 4,
                                            right: 12,
                                            bottom: 0,
                                            left: 4,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke={BORDER}
                                            horizontal={false}
                                        />
                                        <XAxis
                                            type="number"
                                            tick={{
                                                fill: MUTED,
                                                fontSize: 12,
                                            }}
                                            tickLine={false}
                                            axisLine={{ stroke: BORDER }}
                                            allowDecimals={false}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            tick={{
                                                fill: CHARCOAL,
                                                fontSize: 12,
                                            }}
                                            tickLine={false}
                                            axisLine={false}
                                            width={132}
                                        />
                                        <Tooltip
                                            content={<ReportTooltip />}
                                            cursor={{
                                                fill: "rgba(36,35,38,0.04)",
                                            }}
                                        />
                                        <Bar
                                            dataKey="bookings"
                                            name="Bookings"
                                            fill={PRIMARY}
                                            radius={[0, 6, 6, 0]}
                                            maxBarSize={24}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card
                            title="Service breakdown"
                            actions={
                                <span className="text-xs text-muted">
                                    share of {report.totalBookings} bookings
                                </span>
                            }
                        >
                            <ul className="grid gap-3">
                                {topServices.map((service, index) => {
                                    const share =
                                        report.totalBookings > 0
                                            ? (service.bookings /
                                                report.totalBookings) *
                                                100
                                            : 0;
                                    return (
                                        <li key={service.serviceId}>
                                            <div className="flex items-baseline justify-between gap-3 text-sm">
                                                <span className="font-medium text-charcoal">
                                                    <span className="mr-2 font-mono text-xs text-muted">
                                                        {index + 1}.
                                                    </span>
                                                    {service.name}
                                                </span>
                                                <span className="whitespace-nowrap text-xs text-muted">
                                                    {service.bookings} bookings ·{" "}
                                                    {peso(service.revenue)}
                                                </span>
                                            </div>
                                            <div
                                                aria-hidden
                                                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-charcoal/10"
                                            >
                                                <div
                                                    className="h-full rounded-full bg-primary transition-all"
                                                    style={{
                                                        width: `${Math.max(share, 2)}%`,
                                                    }}
                                                />
                                            </div>
                                            <p className="mt-1 text-right text-[11px] text-muted">
                                                {share.toFixed(1)}%
                                            </p>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
