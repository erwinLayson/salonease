import type { ReactNode } from "react";
import { Modal } from "./Modal";

/**
 * Confirmation modal for sensitive transactions (deletes, cancellations,
 * deactivations, reschedules). Wraps {@link Modal}, so Escape/backdrop
 * close it, focus is trapped and focus returns to the trigger on close.
 */
export function ConfirmDialog(props: {
    title: string;
    /** Body content — may include rich JSX (names, appointment lists). */
    message: ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    /** Label shown on the confirm button while the request is in flight. */
    busyLabel?: string;
    /** `danger` (default) for destructive actions, `brand` for neutral confirmations. */
    tone?: "danger" | "brand";
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const tone = props.tone ?? "danger";

    return (
        <Modal title={props.title} onClose={props.onCancel}>
            <div className="text-sm leading-relaxed text-charcoal">{props.message}</div>
            <div className="mt-5 flex justify-end gap-3">
                <button
                    type="button"
                    disabled={props.busy}
                    onClick={props.onCancel}
                    className="min-h-11 rounded-lg border border-border px-4 py-2 text-sm text-charcoal transition-colors hover:bg-charcoal/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {props.cancelLabel ?? "Cancel"}
                </button>
                <button
                    type="button"
                    disabled={props.busy}
                    aria-busy={props.busy ?? false}
                    onClick={props.onConfirm}
                    className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        tone === "danger"
                            ? "bg-danger hover:bg-danger/90"
                            : "bg-primary-dark hover:bg-primary-press"
                    }`}
                >
                    {props.busy && props.busyLabel
                        ? props.busyLabel
                        : props.confirmLabel}
                </button>
            </div>
        </Modal>
    );
}
