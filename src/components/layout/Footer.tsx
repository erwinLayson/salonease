import logo from "../../../public/company-logo.png";

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

export function Footer() {
    return (
        <footer className="relative overflow-hidden bg-ink text-white">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
                <div>
                    <span className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-surface ring-1 ring-gold/60">
                            <img src={logo} alt="" className="h-full w-full object-cover" />
                        </span>
                        <span className="font-display text-xl font-semibold leading-tight text-white">
                            Raheem Make Up Studio
                            <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-gold-light">
                                and Salon
                            </span>
                        </span>
                    </span>
                    <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
                        Hair, make-up and beauty appointments — booked online in under a minute.
                    </p>
                </div>

                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
                        Explore
                    </h3>
                    <ul className="mt-5 space-y-3 text-sm text-white/70">
                        {EXPLORE_LINKS.map((link) => (
                            <li key={link.href}>
                                <a href={link.href} className="transition-colors hover:text-gold-light">
                                    {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
                        Bookings
                    </h3>
                    <ul className="mt-5 space-y-3 text-sm text-white/70">
                        {ACCOUNT_LINKS.map((link) => (
                            <li key={link.href}>
                                <a href={link.href} className="transition-colors hover:text-gold-light">
                                    {link.label}
                                </a>
                            </li>
                        ))}
                        <li>Walk-ins welcome during opening hours</li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
                        Opening hours
                    </h3>
                    <ul className="mt-5 space-y-3 text-sm text-white/70">
                        <li>
                            <span className="block text-white">Monday – Saturday</span>
                            9:00 AM – 6:00 PM
                        </li>
                        <li>
                            <span className="block text-white">Sunday</span>
                            Closed
                        </li>
                    </ul>
                </div>
            </div>

            <div className="border-t border-white/10 py-5 text-center text-xs tracking-wide text-white/50">
                © {new Date().getFullYear()} Raheem Make Up Studio and Salon · Powered by SalonEase
            </div>
        </footer>
    );
}
