import heroImage from "../../assets/landing_page-logo.png";

const STATS = [
    { value: "8+", label: "Beauty services" },
    { value: "Mon–Sat", label: "Open 9 AM – 6 PM" },
    { value: "< 1 min", label: "To book online" },
];

export function Hero() {
    return (
        <section className="relative overflow-hidden border-b border-border bg-background">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary-light/50 blur-3xl"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-48 -left-40 h-96 w-96 rounded-full bg-gold-soft blur-3xl"
            />
            <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
                <div>
                    <div className="flex items-center gap-3">
                        <span aria-hidden className="h-px w-8 bg-gold" />
                        <p className="eyebrow">Raheem Make Up Studio and Salon</p>
                    </div>
                    <h1 className="mt-6 text-6xl leading-[0.95] tracking-tight sm:text-7xl">
                        Look <span className="italic text-primary">flawless.</span>
                        <br />
                        Feel confident.
                    </h1>
                    <p className="mt-7 max-w-md text-base leading-relaxed text-muted">
                        Book hair, make-up and beauty appointments online — pick your service,
                        your stylist, and a time that works for you. No account needed.
                    </p>
                    <div className="mt-9 flex flex-wrap gap-3">
                        <a
                            href="/book"
                            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium tracking-wide text-white shadow-card transition-colors hover:bg-primary-dark"
                        >
                            Book an appointment <span aria-hidden>→</span>
                        </a>
                        <a
                            href="/#services"
                            className="inline-flex min-h-12 items-center rounded-lg border border-border-strong px-6 py-3 text-sm font-medium tracking-wide text-charcoal transition-colors hover:border-gold hover:bg-gold-soft/40"
                        >
                            Explore services
                        </a>
                    </div>
                    <dl className="mt-14 grid max-w-md grid-cols-3 gap-4 border-t border-border pt-7">
                        {STATS.map((stat) => (
                            <div key={stat.label}>
                                <dt className="font-display text-2xl font-semibold text-primary">
                                    {stat.value}
                                </dt>
                                <dd className="mt-1 text-[11px] leading-snug uppercase tracking-wider text-muted">
                                    {stat.label}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <div className="relative mx-auto w-full max-w-lg">
                    <div aria-hidden className="absolute -bottom-4 -right-4 h-full w-full rounded-[2rem] border border-gold/50" />
                    <img
                        src={heroImage}
                        alt="Stylist finishing a client's look at Raheem Make Up Studio and Salon"
                        className="relative w-full rounded-[2rem] border border-border bg-surface object-cover shadow-lift"
                    />
                    <div className="absolute -bottom-6 -left-4 rounded-xl border border-border bg-surface px-5 py-3 shadow-lift sm:-left-8">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-deep">
                            Studio hours
                        </p>
                        <p className="mt-1 text-sm font-semibold text-charcoal">
                            Mon – Sat · 9 AM – 6 PM
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
