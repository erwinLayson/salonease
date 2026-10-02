import { useEffect } from "react";
import { dismissToast, useToasts } from "../../lib/toast";
import type { Toast } from "../../lib/toast";

/** How long a toast stays before dismissing itself. */
const TOAST_MS = 4500;

const KIND_STYLE: Record<Toast["kind"], string> = {
    success:
        "border-success-line bg-success-bg text-success",
    error:
        "border-danger-line bg-danger-bg text-danger",
    info:
        "border-border bg-surface",
};

const KIND_BADGE: Record<Toast["kind"], string> = {
    success: "bg-success",
    error: "bg-danger",
    info: "bg-primary-dark",
};

const KIND_GLYPH: Record<Toast["kind"], string> = {
    success: "✓",
    error: "!",
    info: "i",
};

/** A single auto-dismissing toast. */
function ToastCard(props: { toast: Toast }) {
    useEffect(() => {
        const timer = window.setTimeout(
            () => dismissToast(props.toast.id),
            TOAST_MS
        );
        return () => window.clearTimeout(timer);
    }, [props.toast.id]);

    return (
        <div
            role={props.toast.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lift ${KIND_STYLE[props.toast.kind]}`}
        >
            <span
                aria-hidden
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${KIND_BADGE[props.toast.kind]}`}
            >
                {KIND_GLYPH[props.toast.kind]}
            </span>
            <p className="min-w-0 flex-1">{props.toast.message}</p>
            <button
                type="button"
                onClick={() => dismissToast(props.toast.id)}
                aria-label="Dismiss"
                className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-charcoal/5 hover:text-charcoal"
            >
                ✕
            </button>
        </div>
    );
}

/** Global toast stack, mounted once in `App.tsx`. */
export function ToastViewport() {
    const toasts = useToasts();

    return (
        <div
            aria-live="polite"
            className="pointer-events-none fixed bottom-4 left-4 right-4 z-[60] flex flex-col gap-2 sm:left-auto sm:max-w-sm"
        >
            {toasts.map((toast) => (
                <ToastCard key={toast.id} toast={toast} />
            ))}
        </div>
    );
}
