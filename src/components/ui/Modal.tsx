import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { isTopDialog, popDialog, pushDialog } from "./modalStack";

const FOCUSABLE =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Centered dialog over a dimmed backdrop. Closes on Escape, backdrop
 * click, or the header's close button; traps keyboard focus while open
 * and restores focus to the triggering element on close.
 */
export function Modal(props: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    wide?: boolean;
}) {
    const { onClose } = props;
    const dialogRef = useRef<HTMLDivElement>(null);
    const modalId = useId();

    // Move focus into the dialog on open; restore it to the opener on close.
    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        const dialog = dialogRef.current;
        const first = dialog?.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? dialog)?.focus();
        return () => {
            opener?.focus?.();
        };
    }, []);

    // Join the modal stack so nested dialogs close one layer at a time.
    useEffect(() => {
        pushDialog(modalId);
        return () => popDialog(modalId);
    }, [modalId]);

    // Close on Escape — but only when this is the topmost dialog.
    useEffect(() => {
        const onKey = (event: globalThis.KeyboardEvent) => {
            if (event.key === "Escape" && isTopDialog(modalId)) {
                onClose();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, modalId]);

    // Lock background scrolling while open.
    useEffect(() => {
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = original;
        };
    }, []);

    // Keep Tab focus cycling inside the dialog.
    const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Tab") {
            return;
        }
        const dialog = dialogRef.current;
        if (!dialog) {
            return;
        }
        const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (nodes.length === 0) {
            return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const current = document.activeElement;
        if (event.shiftKey && (current === first || current === dialog)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && current === last) {
            event.preventDefault();
            first.focus();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                aria-hidden
                className="absolute inset-0 bg-charcoal/50"
                onClick={onClose}
            />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={props.title}
                tabIndex={-1}
                onKeyDown={trapFocus}
                className={`relative max-h-[calc(100svh-2rem)] w-full ${
                    props.wide ? "max-w-2xl" : "max-w-lg"
                } overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-lift`}
            >
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                    <h2 className="text-base font-semibold tracking-tight text-charcoal">
                        {props.title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close dialog"
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
