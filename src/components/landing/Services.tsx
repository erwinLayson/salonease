import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { peso } from "../../lib/utils";
import type { Service } from "../../types";
import { Section, SectionHeading } from "./Section";

/**
 * Frontend-curated "offers" highlight: services marked as popular.
 * The API has no promo flag, so this list is maintained here.
 */
const POPULAR_SERVICES = new Set(["Hair Styling", "Make-up", "Bridal Make-up"]);

/**
 * Services shown per page follow the viewport: phones fit 5 cards,
 * md-and-up grids fit 15. Tailwind's `md` breakpoint is 768px.
 */
function useServicesPageSize(): number {
    const [isMd, setIsMd] = useState(() =>
        window.matchMedia("(min-width: 768px)").matches
    );

    useEffect(() => {
        const query = window.matchMedia("(min-width: 768px)");
        const update = () => setIsMd(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);

    return isMd ? 15 : 5;
}

/** Landing page services & offers section (live data from `GET /public/services`). */
export function Services() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const pageSize = useServicesPageSize();
    const [page, setPage] = useState(1);

    const pageCount = Math.max(1, Math.ceil(services.length / pageSize));
    // Refetching or rotating a phone to landscape can shrink the page
    // count; never let the active page run past the last one.
    const activePage = Math.min(page, pageCount);
    const visible = services.slice(
        (activePage - 1) * pageSize,
        activePage * pageSize
    );

    // Changing how many cards fit a page restarts at the first page.
    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setFailed(false);
            try {
                const res = await api.get<{ data: Service[] }>("/public/services");
                setServices(res.data.data);
            } catch {
                // The axios interceptor toasts the error; keep a
                // retry affordance here.
                setFailed(true);
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [refresh]);

    return (
        <Section id="services" className="bg-primary-light/25">
            <SectionHeading
                eyebrow="Services & offers"
                title="What we offer"
                subtitle="Live prices from our current menu. Popular picks are marked — every service can be booked online in minutes."
            />

            {loading && <p className="text-center text-sm opacity-70">Loading services…</p>}

            {!loading && failed && (
                <div className="mx-auto max-w-md text-center">
                    <p className="text-sm opacity-70">
                        Services could not be loaded.
                    </p>
                    <button
                        type="button"
                        onClick={() => setRefresh((value) => value + 1)}
                        className="mx-auto mt-3 block min-h-11 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-charcoal/5"
                    >
                        Try again
                    </button>
                </div>
            )}

            {!loading && !failed && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {visible.map((service) => (
                            <article
                                key={service.id}
                                className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:border-primary"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-medium">{service.name}</h3>
                                    {POPULAR_SERVICES.has(service.name) && (
                                        <span className="shrink-0 rounded-full bg-primary-dark px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                            Popular
                                        </span>
                                    )}
                                </div>
                                {service.description && (
                                    <p className="mt-2 line-clamp-2 text-sm opacity-70">
                                        {service.description}
                                    </p>
                                )}
                                <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                                    <span className="text-sm">
                                        <strong>{peso(service.price)}</strong>
                                        <span className="opacity-70">
                                            {" "}
                                            · {service.durationMinutes} min
                                        </span>
                                    </span>
                                    <a
                                        href="/book"
                                        className="inline-flex min-h-11 items-center text-sm font-medium text-primary-dark hover:underline"
                                    >
                                        Book →
                                    </a>
                                </div>
                            </article>
                        ))}
                    </div>

                    {pageCount > 1 && (
                        <nav
                            className="mt-8 flex flex-wrap items-center justify-center gap-2"
                            aria-label="Services pagination"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setPage((value) => Math.max(1, value - 1))
                                }
                                disabled={activePage === 1}
                                className="hidden min-h-11 items-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/5 disabled:opacity-50 md:inline-flex"
                            >
                                ← Previous
                            </button>
                            {Array.from(
                                { length: pageCount },
                                (_, index) => index + 1
                            ).map((pageNumber) => (
                                <button
                                    key={pageNumber}
                                    type="button"
                                    onClick={() => setPage(pageNumber)}
                                    aria-current={
                                        pageNumber === activePage
                                            ? "page"
                                            : undefined
                                    }
                                    className={
                                        pageNumber === activePage
                                            ? "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-primary-dark px-3 text-sm font-semibold text-white shadow-sm"
                                            : "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/5"
                                    }
                                >
                                    {pageNumber}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() =>
                                    setPage((value) =>
                                        Math.min(pageCount, value + 1)
                                    )
                                }
                                disabled={activePage === pageCount}
                                className="hidden min-h-11 items-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/5 disabled:opacity-50 md:inline-flex"
                            >
                                Next →
                            </button>
                        </nav>
                    )}

                    {services.length === 0 && (
                        <p className="text-center text-sm opacity-70">
                            No services are available right now.
                        </p>
                    )}
                </>
            )}
        </Section>
    );
}
