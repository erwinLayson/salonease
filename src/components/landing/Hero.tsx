import heroImage from "../../assets/landing_page-logo.png";

const STATS = [
    { value: "8+", label: "Beauty services" },
    { value: "Mon–Sat", label: "Open 9 AM – 6 PM" },
    { value: "< 1 min", label: "To book online" },
];

/** Landing page hero: headline, calls to action, stats and hero image. */
export function Hero() {
    return (
        <section className="relative overflow-hidden border-b border-border">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-light/60 blur-3xl"
            />
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary-dark">
                        Raheem Make Up Studio and Salon
                    </p>
                    <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                        Look flawless.
                        <br />
                        Feel confident.
                    </h1>
                    <p className="mt-4 max-w-md text-sm opacity-70 sm:text-base">
                        Book hair, make-up and beauty appointments online — pick your service,
                        your stylist, and a time that works for you. No account needed.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <a
                            href="/book"
                            className="inline-flex min-h-11 items-center rounded-md bg-primary-dark px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-press focus-visible:outline-2"
                        >
                            Book an appointment
                        </a>
                        <a
                            href="/#services"
                            className="inline-flex min-h-11 items-center rounded-md border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-charcoal/5"
                        >
                            Explore services
                        </a>
                    </div>
                    <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-border pt-6">
                        {STATS.map((stat) => (
                            <div key={stat.label}>
                                <dt className="text-lg font-semibold">{stat.value}</dt>
                                <dd className="text-xs opacity-70">{stat.label}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <div className="relative">
                    <img
                        src={heroImage}
                        alt="Stylist finishing a client's look at Raheem Make Up Studio and Salon"
                        className="w-full rounded-2xl border border-border object-cover shadow-lg"
                    />
                </div>
            </div>
        </section>
    );
}
