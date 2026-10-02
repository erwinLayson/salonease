const EXPLORE_LINKS = [
    { href: "/#about", label: "About us" },
    { href: "/#services", label: "Services & offers" },
    { href: "/#team", label: "Our team" },
    { href: "/book", label: "Book an appointment" },
];

const ACCOUNT_LINKS = [
    { href: "/manage", label: "Manage a booking" },
    { href: "/login", label: "Staff login" },
];

/** Public site footer used by the landing and booking pages. */
export function Footer() {
    return (
        <footer className="border-t border-border bg-surface">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <span className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
                            R
                        </span>
                        <span className="text-sm font-semibold tracking-tight">
                            Raheem Make Up Studio and Salon
                        </span>
                    </span>
                    <p className="mt-3 text-sm text-muted">
                        Hair, make-up and beauty appointments — booked online in under a minute.
                    </p>
                </div>

                <div>
                    <h3 className="text-sm font-semibold">Explore</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted">
                        {EXPLORE_LINKS.map((link) => (
                            <li key={link.href}>
                                <a href={link.href} className="transition-colors hover:text-charcoal hover:underline">
                                    {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="text-sm font-semibold">Bookings</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted">
                        {ACCOUNT_LINKS.map((link) => (
                            <li key={link.href}>
                                <a href={link.href} className="transition-colors hover:text-charcoal hover:underline">
                                    {link.label}
                                </a>
                            </li>
                        ))}
                        <li>Walk-ins welcome during opening hours</li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-sm font-semibold">Opening hours</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted">
                        <li>
                            <span className="opacity-100">Monday – Saturday</span>
                            <br />
                            9:00 AM – 6:00 PM
                        </li>
                        <li>
                            <span className="opacity-100">Sunday</span>
                            <br />
                            Closed
                        </li>
                    </ul>
                </div>
            </div>

            <div className="border-t border-border py-4 text-center text-xs text-muted">
                © {new Date().getFullYear()} Raheem Make Up Studio and Salon · Powered by SalonEase
            </div>
        </footer>
    );
}
