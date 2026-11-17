import type { ReactNode } from "react";

export function Section(props: { id?: string; className?: string; children: ReactNode }) {
    return (
        <section id={props.id} className={`scroll-mt-24 ${props.className ?? ""}`}>
            <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">{props.children}</div>
        </section>
    );
}

export function SectionHeading(props: { eyebrow: string; title: string; subtitle?: string }) {
    return (
        <div className="mx-auto mb-14 max-w-2xl text-center">
            <div className="flex items-center justify-center gap-3">
                <span aria-hidden className="h-px w-8 bg-gold" />
                <p className="eyebrow">{props.eyebrow}</p>
                <span aria-hidden className="h-px w-8 bg-gold" />
            </div>
            <h2 className="mt-4 text-5xl leading-tight tracking-tight sm:text-6xl">
                {props.title}
            </h2>
            <span aria-hidden className="mx-auto mt-5 block h-px w-16 bg-gold/70" />
            {props.subtitle && (
                <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted">
                    {props.subtitle}
                </p>
            )}
        </div>
    );
}
