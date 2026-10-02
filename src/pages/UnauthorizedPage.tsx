/** Shown when a signed-in user opens a page their role cannot access. */
export default function UnauthorizedPage() {
    return (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
            <span
                aria-hidden
                className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-light text-xl font-bold text-charcoal shadow-card"
            >
                403
            </span>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">
                You don't have access to this page
            </h1>
            <p className="mt-3 text-sm text-muted">
                Your account doesn't have permission to view that area. Sign in with an account
                that has access, or head back to the home page.
            </p>
            <div className="mt-6 flex justify-center gap-3">
                <a
                    href="/"
                    className="rounded-lg bg-primary-dark min-h-11 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-press"
                >
                    Back home
                </a>
                <a
                    href="/login"
                    className="rounded-lg border border-border min-h-11 px-4 py-2 text-sm transition-colors hover:bg-charcoal/5"
                >
                    Staff login
                </a>
            </div>
        </div>
    );
}
