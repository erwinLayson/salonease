import type { ReactNode } from "react";

/**
 * Hover tooltip for a wrapped control. Uses the same dark, elevated
 * surface as the calendar tooltips, so icon-only actions stay
 * self-describing without adding persistent labels. The wrapped
 * control carries its own accessible name (`aria-label`).
 */
export function Tooltip(props: { label: string; children: ReactNode }) {
    return (
        <span className="group relative inline-flex">
            {props.children}
            <span
                aria-hidden
                className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 hidden w-max max-w-48 -translate-x-1/2 rounded-lg border border-border bg-charcoal px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-lift group-hover:block"
            >
                {props.label}
            </span>
        </span>
    );
}
