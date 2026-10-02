import type { ReactNode } from "react";

// UI components
import { Tooltip } from "../ui/Tooltip";

/**
 * Icon-only row action with a hover tooltip naming the action.
 * Mirrors `StatusAction`'s border and hover treatment, sized like
 * the other icon buttons in the app (`min-h-11 min-w-11`).
 */
export function IconAction(props: {
    /** Tooltip text and accessible name for the button. */
    label: string;
    icon: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    /** Red hover treatment for destructive actions. */
    variant?: "default" | "danger";
}) {
    return (
        <Tooltip label={props.label}>
            <button
                type="button"
                disabled={props.disabled}
                onClick={props.onClick}
                aria-label={props.label}
                className={`grid min-h-11 min-w-11 place-items-center rounded-lg border border-border bg-surface text-charcoal transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    props.variant === "danger"
                        ? "hover:border-danger-line hover:bg-danger-bg hover:text-danger"
                        : "hover:border-primary hover:bg-primary-light/30"
                }`}
            >
                {props.icon}
            </button>
        </Tooltip>
    );
}
