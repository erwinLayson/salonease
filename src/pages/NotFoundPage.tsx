/** Catch-all page for unknown URLs. */
export default function NotFoundPage() {
    return (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
            <span
                aria-hidden
                className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-light text-xl font-bold text-charcoal shadow-card"
            >
                404
            </span>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">Page not found</h1>
            <p className="mt-3 text-sm text-muted">
                The page you're looking for doesn't exist or may have moved.
            </p>
            <div className="mt-6 flex justify-center gap-3">
                <a
                    href="/"
                    className="rounded-lg bg-primary-dark min-h-11 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-press"
                >
                    Back home
                </a>
                <a
                    href="/book"
                    className="rounded-lg border border-border min-h-11 px-4 py-2 text-sm transition-colors hover:bg-charcoal/5"
                >
                    Book an appointment
                </a>
            </div>
        </div>
    );
}
