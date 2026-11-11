import type { ReactNode } from "react";

// UI components
import { Tooltip } from "../ui/Tooltip";

/**
 * Icon-only row action with a hover tooltip naming the action.
 * Mirrors `StatusAction`'s border and hover treatment, sized like
 * the other icon buttons in the app (`min-h-11 min-w-11` or `h-9 w-9` for compact).
 */
export function IconAction(props: {
    /** Tooltip text and accessible name for the button. */
    label: string;
    icon: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    /** Red or green hover treatment for destructive or affirmative actions. */
    variant?: "default" | "danger" | "success";
    size?: "default" | "sm";
    className?: string;
}) {
    const sizeClasses =
        props.size === "sm" ? "h-9 w-9 text-xs" : "min-h-11 min-w-11";
    return (
        <Tooltip label={props.label}>
            <button
                type="button"
                disabled={props.disabled}
                onClick={props.onClick}
                aria-label={props.label}
                className={`grid ${sizeClasses} place-items-center rounded-lg border border-border bg-surface text-charcoal transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    props.variant === "danger"
                        ? "hover:border-danger-line hover:bg-danger-bg hover:text-danger"
                        : props.variant === "success"
                          ? "hover:border-success hover:bg-success-bg hover:text-success"
                          : "hover:border-primary hover:bg-primary-light/30"
                } ${props.className ?? ""}`}
            >
                {props.icon}
            </button>
        </Tooltip>
    );
}
