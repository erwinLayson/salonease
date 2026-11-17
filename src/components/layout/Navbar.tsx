import { useState } from "react";
import logo from "../../../public/company-logo.png";

const NAV_LINKS = [
    { href: "/#about", label: "About" },
    { href: "/#services", label: "Services" },
    { href: "/#team", label: "Our team" },
];

export function Navbar(props: { active?: "home" | "book" }) {
    const [open, setOpen] = useState(false);

    const brand = (
        <span className="flex items-center gap-3">
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-1 ring-gold/60">
                <img src={logo} alt="" className="h-full w-full object-cover" />
            </span>
            <span className="flex flex-col leading-tight">
                <span className="font-display text-lg font-semibold tracking-tight text-charcoal">
                    Raheem Make Up Studio
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-deep">
                    and Salon
                </span>
            </span>
        </span>
    );

    const linkClass =
        "relative inline-flex min-h-11 items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal transition-colors hover:text-primary after:absolute after:inset-x-3 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-gold after:transition-transform hover:after:scale-x-100";

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
                <a href="/" className="transition-opacity hover:opacity-80" aria-label="Home">
                    {brand}
                </a>

                <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
                    {NAV_LINKS.map((link) => (
                        <a key={link.href} href={link.href} className={linkClass}>
                            {link.label}
                        </a>
                    ))}
                </nav>

                <div className="hidden items-center gap-5 md:flex">
                    <a
                        href="/login"
                        className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-primary"
                    >
                        Staff login <span aria-hidden>↗</span>
                    </a>
                    <a
                        href="/book"
                        aria-current={props.active === "book" ? "page" : undefined}
                        className={`inline-flex min-h-11 items-center rounded-lg px-5 py-2 text-sm font-medium tracking-wide text-white shadow-card transition-colors ${
                            props.active === "book"
                                ? "bg-gold-deep"
                                : "bg-primary hover:bg-primary-dark"
                        }`}
                    >
                        Book now
                    </a>
                </div>

                <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-strong px-4 py-2 text-xs font-semibold uppercase tracking-wider text-charcoal transition-colors hover:border-gold hover:bg-gold-soft/40 md:hidden"
                    aria-expanded={open}
                    aria-label="Toggle navigation menu"
                    onClick={() => setOpen((value) => !value)}
                >
                    <span aria-hidden className="text-base leading-none">
                        {open ? "×" : "☰"}
                    </span>
                    {open ? "Close" : "Menu"}
                </button>
            </div>

            {open && (
                <div className="border-t border-border bg-surface px-5 py-4 sm:px-8 md:hidden">
                    <nav className="flex flex-col gap-1" aria-label="Main">
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setOpen(false)}
                                className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-gold-soft/50"
                            >
                                {link.label}
                            </a>
                        ))}
                        <a
                            href="/login"
                            onClick={() => setOpen(false)}
                            className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-gold-soft/50"
                        >
                            Staff login
                        </a>
                    </nav>
                    <a
                        href="/book"
                        onClick={() => setOpen(false)}
                        className="mt-3 block min-h-11 rounded-lg bg-primary px-4 py-3 text-center text-sm font-medium text-white shadow-card"
                    >
                        Book now
                    </a>
                </div>
            )}
        </header>
    );
}
