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
import { dateInDays, peso } from "../../lib/utils";

import { Card } from "../../components/ui/Card";
import { Select } from "../../components/ui/Select";

import type {
    SalesGroupBy,
    SalesReportRow,
    CommissionEntry,
    YearlyReport,
} from "../../types";

const PRIMARY = "#C95F78";
const CHARCOAL = "#242326";
const MUTED = "#6E6B6F";
const BORDER = "#E5E1E2";

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

/** Chart-friendly row for the monthly revenue chart. */
interface MonthPoint {
    label: string;
    revenue: number;
    bookings: number;
}

export default function ReportsPage() {
    const currentYear = new Date().getFullYear();
    const [selectedTab, setSelectedTab] =
        useState<"yearly" | "daily" | "commissions">("yearly");

    const [year, setYear] = useState(String(currentYear));
    const [report, setReport] = useState<YearlyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const now = new Date();
    const today = dateInDays(0);
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const [dailyFrom, setDailyFrom] = useState(monthStart);
    const [dailyTo, setDailyTo] = useState(today);
    const [dailyGroup, setDailyGroup] = useState<SalesGroupBy>("day");

    const [commissionsFrom, setCommissionsFrom] = useState(monthStart);
    const [commissionsTo, setCommissionsTo] = useState(today);

    const [dailyRows, setDailyRows] = useState<SalesReportRow[]>([]);
    const [commissionsRows, setCommissionsRows] = useState<CommissionEntry[]>([]);

    // Keep setters/values referenced by effect dependency lists.
    // Keep setters/values referenced by effect dependency lists.
    void setSelectedTab;
    void setDailyFrom;
    void setDailyTo;
    void setDailyGroup;
    void setCommissionsFrom;
    void setCommissionsTo;
    void setDailyRows;
    void setCommissionsRows;
    void dailyRows;
    void commissionsRows;

    const yearOptions = [
        ...new Set([
            currentYear,
            ...(report?.years ?? []),
        ]),
    ]
        .sort((a, b) => b - a)
        .map((value) => ({ value: String(value), label: String(value) }));

    const topService = report?.topServices[0];

    const reloadYearly = useCallback(async () => {
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

    // Reset dependent state when the active tab changes, so stale totals do
    // not sit on-screen while the new tab loads.
    useEffect(() => {
        setDailyRows([]);
    }, [selectedTab]);

    useEffect(() => {
        void Promise.resolve().then(reloadYearly);
    }, [reloadYearly]);

    const topServices = report?.topServices ?? [];
    const hasData = report !== null && (report.totalBookings ?? 0) > 0;

    const monthlyChartData: MonthPoint[] = report
        ? report.months.map((row) => ({
              label: MONTH_SHORT[row.month - 1],
              revenue: row.revenue,
              bookings: row.bookings,
          }))
        : [];

    useEffect(() => {
        if (selectedTab !== "daily") return;
        let cancelled = false;
        setLoading(true);
        api
            .get<{ data: SalesReportRow[] }>("/owner/reports/daily-sales", {
                params: { from: dailyFrom, to: dailyTo, groupBy: dailyGroup },
            })
            .then((res) => {
                if (!cancelled) setDailyRows(res.data.data);
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [selectedTab, dailyFrom, dailyTo, dailyGroup]);

    useEffect(() => {
        if (selectedTab !== "commissions") return;
        let cancelled = false;
        api
            .get<{ data: CommissionEntry[] }>("/owner/commissions/entries", {
                params: { from: commissionsFrom, to: commissionsTo },
            })
            .then((res) => {
                if (!cancelled) setCommissionsRows(res.data.data);
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [selectedTab, commissionsFrom, commissionsTo]);

    return (
        <div className="grid gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div
                    className="flex flex-wrap items-center gap-3"
                    style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "0.75rem" }}
                >
                    <div
                        className="text-xl font-semibold tracking-tight"
                        style={{ fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-0.02em" }}
                    >
                        Reports
                    </div>
                    <div
                        className="mt-1 text-sm text-muted"
                        style={{ marginTop: "0.25rem", color: "#6E6B6F" }}
                    >
                        Yearly income trends and your most booked services.
                    </div>
                </div>
                <div
                    className="w-40"
                    style={{ width: "10rem" }}
                >
                    <Select
                        label="Year"
                        value={year}
                        onChange={setYear}
                        options={yearOptions}
                    />
                </div>
            </header>

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
                            disabled={loading}
                            onClick={() => void reloadYearly()}
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
                                    data={monthlyChartData}
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
                                className="h-60"
                                style={{ height: Math.max(168, topServices.length * 44) }}
                            >
                                <ResponsiveContainer width="100%" height="100%">
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
                                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
                                        <XAxis type="number" tick={{ fill: MUTED, fontSize: 12 }} tickLine={false} axisLine={{ stroke: BORDER }} allowDecimals={false} />
                                        <YAxis type="category" dataKey="name" tick={{ fill: CHARCOAL, fontSize: 12 }} tickLine={false} axisLine={false} width={132} />
                                        <Tooltip content={<ReportTooltip />} />
                                        <Bar dataKey="bookings" name="Bookings" fill={PRIMARY} radius={[0, 6, 6, 0]} maxBarSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                        <Card title="Service breakdown" actions={<span className="text-xs text-muted">share of {report.totalBookings} bookings</span>}>
                            <ul className="grid gap-3">
                                {topServices.map((service, index) => {
                                    const share = report.totalBookings > 0 ? (service.bookings / report.totalBookings) * 100 : 0;
                                    return (
                                        <li key={service.serviceId}>
                                            <div className="flex items-baseline justify-between gap-3 text-sm">
                                                <span className="font-medium text-charcoal">
                                                    <span className="mr-2 font-mono text-xs text-muted">{index + 1}.</span>
                                                    {service.name}
                                                </span>
                                                <span className="whitespace-nowrap text-xs text-muted">{service.bookings} bookings · {peso(service.revenue)}</span>
                                            </div>
                                            <div aria-hidden className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-charcoal/10">
                                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(share, 2)}%` }} />
                                            </div>
                                            <p className="mt-1 text-right text-[11px] text-muted">{share.toFixed(1)}%</p>
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
