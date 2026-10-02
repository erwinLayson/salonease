import type { ReactNode } from "react";

export function Card(props: {
    title?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={`rounded-2xl border border-border bg-surface p-5 shadow-card ${props.className ?? ""}`}
        >
            {props.title && (
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                    <h2 className="text-base font-semibold tracking-tight">
                        {props.title}
                    </h2>
                    {props.actions}
                </div>
            )}
            {props.children}
        </section>
    );
}
