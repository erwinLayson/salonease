export function CtaBand() {
    return (
        <section className="relative overflow-hidden bg-primary-dark text-white">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full border border-gold/20"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-40 -right-16 h-96 w-96 rounded-full border border-gold/20"
            />
            <div className="relative mx-auto max-w-7xl px-5 py-20 text-center sm:px-8">
                <div className="flex items-center justify-center gap-3">
                    <span aria-hidden className="h-px w-8 bg-gold" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-light">
                        Your next look awaits
                    </p>
                    <span aria-hidden className="h-px w-8 bg-gold" />
                </div>
                <h2 className="mt-5 text-5xl tracking-tight text-white sm:text-6xl">
                    Ready for your next look?
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/75">
                    Book online in under a minute — no account needed, and you'll get a private
                    link to manage your appointment.
                </p>
                <a
                    href="/book"
                    className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gold px-7 py-3 text-sm font-semibold tracking-wide text-ink shadow-card transition-colors hover:bg-gold-light"
                >
                    Book an appointment <span aria-hidden>→</span>
                </a>
                <p className="mt-6 text-xs uppercase tracking-widest text-white/60">
                    Open Monday to Saturday · 9:00 AM – 6:00 PM
                </p>
            </div>
        </section>
    );
}
