import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { isTopDialog, popDialog, pushDialog } from "./modalStack";

const FOCUSABLE =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Right-side detail panel over a dimmed backdrop. Behaves like Modal
 * (Escape/backdrop/close, focus trap, scroll lock) but docks to the edge —
 * used for appointment details alongside the schedule.
 */
export function Drawer(props: {
    title: string;
    onClose: () => void;
    children: ReactNode;
}) {
    const { onClose } = props;
    const panelRef = useRef<HTMLDivElement>(null);
    const drawerId = useId();

    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        const panel = panelRef.current;
        const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? panel)?.focus();
        return () => {
            opener?.focus?.();
        };
    }, []);

    useEffect(() => {
        pushDialog(drawerId);
        return () => popDialog(drawerId);
    }, [drawerId]);

    useEffect(() => {
        const onKey = (event: globalThis.KeyboardEvent) => {
            if (event.key === "Escape" && isTopDialog(drawerId)) {
                onClose();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, drawerId]);

    useEffect(() => {
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = original;
        };
    }, []);

    const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Tab") {
            return;
        }
        const panel = panelRef.current;
        if (!panel) {
            return;
        }
        const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (nodes.length === 0) {
            return;
        }
        const first = nodes[0]!;
        const last = nodes[nodes.length - 1]!;
        const current = document.activeElement;
        if (event.shiftKey && (current === first || current === panel)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && current === last) {
            event.preventDefault();
            first.focus();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div
                aria-hidden
                className="absolute inset-0 bg-charcoal/50"
                onClick={onClose}
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={props.title}
                tabIndex={-1}
                onKeyDown={trapFocus}
                className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface p-5 shadow-lift"
            >
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                    <h2 className="text-base font-semibold tracking-tight text-charcoal">
                        {props.title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close panel"
                        className="min-h-11 rounded-lg px-3 text-charcoal transition-colors hover:bg-charcoal/5"
                    >
                        ✕
                    </button>
                </div>
                {props.children}
            </div>
        </div>
    );
}
