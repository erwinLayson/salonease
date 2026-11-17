import type { ReactNode } from "react";

export function Card(props: {
    title?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={`shrink-0 overflow-hidden rounded-card border border-border bg-surface shadow-card ${props.className ?? ""}`}
        >
            {props.title && (
                <div className="relative border-b border-border px-5 py-4">
                    <span aria-hidden className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-gold via-gold/40 to-transparent" />
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg tracking-tight">{props.title}</h2>
                        {props.actions}
                    </div>
                </div>
            )}
            <div className="p-5">{props.children}</div>
        </section>
    );
}
