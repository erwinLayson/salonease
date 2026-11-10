import { useCallback, useEffect, useRef, useState } from "react";
import { dismissToast, useToasts } from "../../lib/toast";
import type { Toast, ToastKind } from "../../lib/toast";

/** Default display duration before self-dismissing (in ms). */
const DEFAULT_TOAST_MS = 4500;

interface KindVisualConfig {
    defaultTitle: string;
    labelColor: string;
    iconBadge: string;
    accentBar: string;
    progressBar: string;
    borderHighlight: string;
    icon: React.ReactNode;
}

const KIND_CONFIG: Record<ToastKind, KindVisualConfig> = {
    success: {
        defaultTitle: "Success",
        labelColor: "text-emerald-700",
        iconBadge: "bg-emerald-50 text-emerald-600 border border-emerald-200/70",
        accentBar: "bg-emerald-500",
        progressBar: "bg-emerald-500",
        borderHighlight: "hover:border-emerald-200/80",
        icon: (
            <svg
                className="h-4.5 w-4.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <polyline points="20 6 9 17 4 12" />
            </svg>
        ),
    },
    error: {
        defaultTitle: "Error",
        labelColor: "text-rose-700",
        iconBadge: "bg-rose-50 text-rose-600 border border-rose-200/70",
        accentBar: "bg-rose-500",
        progressBar: "bg-rose-500",
        borderHighlight: "hover:border-rose-200/80",
        icon: (
            <svg
                className="h-4.5 w-4.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
        ),
    },
    warning: {
        defaultTitle: "Warning",
        labelColor: "text-amber-800",
        iconBadge: "bg-amber-50 text-amber-600 border border-amber-200/70",
        accentBar: "bg-amber-500",
        progressBar: "bg-amber-500",
        borderHighlight: "hover:border-amber-200/80",
        icon: (
            <svg
                className="h-4.5 w-4.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        ),
    },
    info: {
        defaultTitle: "Notice",
        labelColor: "text-primary-dark",
        iconBadge: "bg-rose-50/70 text-primary-dark border border-primary-light/50",
        accentBar: "bg-primary-dark",
        progressBar: "bg-primary-dark",
        borderHighlight: "hover:border-primary-light/60",
        icon: (
            <svg
                className="h-4.5 w-4.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
        ),
    },
};

/** A single auto-dismissing toast card. */
function ToastCard(props: { toast: Toast }) {
    const { toast } = props;
    const config = KIND_CONFIG[toast.kind] ?? KIND_CONFIG.info;
    const duration = toast.duration ?? DEFAULT_TOAST_MS;

    const [isRendered, setIsRendered] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const remainingRef = useRef(duration);
    const startTimeRef = useRef<number>(0);
    const timerRef = useRef<number | null>(null);

    const clearExistingTimer = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const handleDismiss = useCallback(() => {
        if (isDismissing) return;
        setIsDismissing(true);
        window.setTimeout(() => {
            dismissToast(toast.id);
        }, 220);
    }, [isDismissing, toast.id]);

    const startTimer = useCallback(() => {
        clearExistingTimer();
        startTimeRef.current = Date.now();
        timerRef.current = window.setTimeout(() => {
            handleDismiss();
        }, remainingRef.current);
    }, [clearExistingTimer, handleDismiss]);

    const pauseTimer = useCallback(() => {
        clearExistingTimer();
        const elapsed = Date.now() - startTimeRef.current;
        remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    }, [clearExistingTimer]);

    useEffect(() => {
        const id = requestAnimationFrame(() => setIsRendered(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        startTimer();
        return () => clearExistingTimer();
    }, [startTimer, clearExistingTimer]);

    const handleMouseEnter = () => {
        setIsPaused(true);
        pauseTimer();
    };

    const handleMouseLeave = () => {
        setIsPaused(false);
        startTimer();
    };

    return (
        <div
            role={toast.kind === "error" ? "alert" : "status"}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-border/80 bg-surface/98 backdrop-blur-md p-3.5 sm:p-4 pl-4.5 shadow-[0_12px_32px_-4px_rgba(36,35,38,0.12),0_4px_12px_-2px_rgba(36,35,38,0.06)] transition-all duration-200 ease-out hover:shadow-[0_16px_36px_-4px_rgba(36,35,38,0.18)] ${config.borderHighlight} ${
                !isRendered || isDismissing
                    ? "translate-x-8 opacity-0 scale-95"
                    : "translate-x-0 opacity-100 scale-100"
            }`}
        >
            {/* Visual accent left indicator line */}
            <div
                aria-hidden="true"
                className={`absolute left-0 top-0 bottom-0 w-1 ${config.accentBar}`}
            />

            <div className="flex items-start gap-3">
                {/* Modern circular badge icon */}
                <div
                    aria-hidden="true"
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl shadow-xs ${config.iconBadge}`}
                >
                    {config.icon}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                        <span
                            className={`text-[11px] font-semibold uppercase tracking-wider ${config.labelColor}`}
                        >
                            {toast.title || config.defaultTitle}
                        </span>
                    </div>
                    <p className="mt-0.5 text-sm font-normal text-charcoal leading-snug break-words">
                        {toast.message}
                    </p>
                </div>

                {/* Dismiss button */}
                <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Dismiss notification"
                    className="shrink-0 -mr-1 -mt-1 rounded-lg p-1.5 text-muted/60 transition-colors hover:bg-charcoal/5 hover:text-charcoal focus-visible:outline-2 focus-visible:outline-primary-dark"
                >
                    <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Subtle bottom countdown progress bar */}
            <div
                aria-hidden="true"
                className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/[0.04] overflow-hidden"
            >
                <div
                    className={`h-full w-full origin-left ${config.progressBar} animate-toast-shrink`}
                    style={{
                        animationDuration: `${duration}ms`,
                        animationPlayState: isPaused ? "paused" : "running",
                    }}
                />
            </div>
        </div>
    );
}

/** Global toast stack, mounted once in `App.tsx` and pinned to the top right. */
export function ToastViewport() {
    const toasts = useToasts();

    if (toasts.length === 0) {
        return null;
    }

    return (
        <aside
            aria-label="Notifications"
            aria-live="polite"
            className="pointer-events-none fixed top-4 right-4 left-4 sm:left-auto sm:w-[380px] max-w-full z-[100] flex flex-col items-end gap-2.5"
        >
            {toasts.map((toast) => (
                <ToastCard key={toast.id} toast={toast} />
            ))}
        </aside>
    );
}
