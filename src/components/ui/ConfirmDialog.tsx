import type { ReactNode } from "react";
import { Button } from "./Button";
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
        <Modal
            title={props.title}
            onClose={props.onCancel}
            footer={
                <div className="flex justify-end gap-3">
                    <Button
                        variant="secondary"
                        disabled={props.busy}
                        onClick={props.onCancel}
                    >
                        {props.cancelLabel ?? "Cancel"}
                    </Button>
                    <Button
                        variant={tone === "danger" ? "danger" : "primary"}
                        disabled={props.busy}
                        loading={props.busy}
                        onClick={props.onConfirm}
                    >
                        {props.busy && props.busyLabel
                            ? props.busyLabel
                            : props.confirmLabel}
                    </Button>
                </div>
            }
        >
            <div className="text-sm leading-relaxed text-charcoal">{props.message}</div>
        </Modal>
    );
}
