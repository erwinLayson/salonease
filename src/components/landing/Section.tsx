import type { ReactNode } from "react";

/** Full-width landing section with a centred container. */
export function Section(props: { id?: string; className?: string; children: ReactNode }) {
    return (
        <section id={props.id} className={`scroll-mt-20 ${props.className ?? ""}`}>
            <div className="mx-auto max-w-6xl px-4 py-16">{props.children}</div>
        </section>
    );
}

/** Centred eyebrow + title + optional subtitle used at the top of a section. */
export function SectionHeading(props: { eyebrow: string; title: string; subtitle?: string }) {
    return (
        <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-dark">
                {props.eyebrow}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">{props.title}</h2>
            {props.subtitle && <p className="mt-3 text-sm opacity-70">{props.subtitle}</p>}
        </div>
    );
}
