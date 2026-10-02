/** Closing call-to-action band above the footer. */
export function CtaBand() {
    return (
        <section className="bg-primary-dark text-white">
            <div className="mx-auto max-w-6xl px-4 py-16 text-center">
                <h2 className="text-3xl font-semibold tracking-tight">Ready for your next look?</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm text-white/90">
                    Book online in under a minute — no account needed, and you'll get a private
                    link to manage your appointment.
                </p>
                <a
                    href="/book"
                    className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-surface px-6 py-3 text-sm font-semibold text-primary-dark transition-colors hover:bg-primary-light/30"
                >
                    Book an appointment
                </a>
                <p className="mt-4 text-xs text-white/90">
                    Open Monday to Saturday · 9:00 AM – 6:00 PM
                </p>
            </div>
        </section>
    );
}
