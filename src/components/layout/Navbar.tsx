import { useState } from "react";
import logo from "../../../public/company-logo.png"

const NAV_LINKS = [
    { href: "/#about", label: "About" },
    { href: "/#services", label: "Services" },
    { href: "/#team", label: "Our team" },
];

/**
 * Public site header used by the landing and booking pages.
 * Anchor links point at `/#…` so they also work from `/book`.
 */
export function Navbar(props: { active?: "home" | "book" }) {
    const [open, setOpen] = useState(false);

    const brand = (
        <span className="flex items-center gap-2">
            <div className="relative w-16 h-16 rounded-full items-center justify-center flex overflow-hidden">
                <img src={logo} alt="" />
            </div>
            <span className="text-sm font-semibold tracking-tight sm:text-base">
                Raheem Make Up Studio <span className="hidden sm:inline">and Salon</span>
            </span>
        </span>
    );

    const bookClass =
        props.active === "book"
            ? "inline-flex min-h-11 items-center rounded-lg bg-primary-press px-4 py-2 text-sm font-medium text-white"
            : "inline-flex min-h-11 items-center rounded-lg bg-primary-dark px-4 py-2 text-sm font-medium text-white hover:bg-primary-press";

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                <a href="/" className="hover:opacity-80" aria-label="Home">
                    {brand}
                </a>

                <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm text-charcoal transition-colors hover:bg-charcoal/5"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                <div className="hidden items-center gap-2 md:flex">
                    <a
                        href="/login"
                        className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 py-2 text-sm text-charcoal transition-colors hover:bg-charcoal/5"
                    >
                        Staff login
                    </a>
                    <a
                        href="/book"
                        aria-current={props.active === "book" ? "page" : undefined}
                        className={bookClass}
                    >
                        Book now
                    </a>
                </div>

                <button
                    type="button"
                    className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-charcoal transition-colors hover:bg-charcoal/5 md:hidden"
                    aria-expanded={open}
                    aria-label="Toggle navigation menu"
                    onClick={() => setOpen((value) => !value)}
                >
                    {open ? "Close" : "Menu"}
                </button>
            </div>

            {open && (
                <div className="border-t border-border px-4 py-3 md:hidden">
                    <nav className="flex flex-col gap-1" aria-label="Main">
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setOpen(false)}
                                className="min-h-11 rounded-lg px-3 py-2 text-sm text-charcoal transition-colors hover:bg-charcoal/5"
                            >
                                {link.label}
                            </a>
                        ))}
                        <a
                            href="/login"
                            onClick={() => setOpen(false)}
                            className="min-h-11 rounded-lg px-3 py-2 text-sm text-charcoal transition-colors hover:bg-charcoal/5"
                        >
                            Staff login
                        </a>
                    </nav>
                    <a
                        href="/book"
                        onClick={() => setOpen(false)}
                        className="mt-2 block min-h-11 rounded-lg bg-primary-dark px-4 py-2 text-center text-sm font-medium text-white"
                    >
                        Book now
                    </a>
                </div>
            )}
        </header>
    );
}
