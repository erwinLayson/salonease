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
                                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition hover:border-primary"
                            >
                                <div className="relative aspect-16/9 w-full overflow-hidden bg-charcoal/5 border-b border-border/60">
                                    {service.image ? (
                                        <img
                                            src={service.image}
                                            alt={service.name}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-primary-light/30 text-primary-dark">
                                            <svg
                                                className="h-10 w-10 opacity-40"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                aria-hidden="true"
                                            >
                                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                                <circle cx="9" cy="9" r="2" />
                                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                            </svg>
                                        </div>
                                    )}
                                    {POPULAR_SERVICES.has(service.name) && (
                                        <span className="absolute top-2.5 right-2.5 rounded-full bg-primary-dark px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                                            Popular
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-1 flex-col p-5">
                                    <h3 className="font-semibold text-charcoal">{service.name}</h3>
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
