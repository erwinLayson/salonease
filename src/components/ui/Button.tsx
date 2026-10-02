import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary:
        "bg-primary-dark text-white shadow-sm hover:bg-primary-press active:bg-primary-press",
    secondary:
        "border border-border bg-surface text-charcoal hover:bg-charcoal/5 active:bg-charcoal/10",
    ghost: "text-charcoal hover:bg-charcoal/5 active:bg-charcoal/10",
    danger:
        "border border-danger-line bg-surface text-danger hover:bg-danger-bg active:bg-danger-line/60",
};

/**
 * Shared button with the full state set: default / hover / active / focus
 * (global :focus-visible ring) / disabled / loading via `aria-busy`.
 */
export function Button({
    variant = "primary",
    loading = false,
    children,
    className,
    disabled,
    ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    /** Shows the loading state and blocks duplicate submissions. */
    loading?: boolean;
    children: ReactNode;
}) {
    return (
        <button
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${className ?? ""}`}
            {...rest}
        >
            {loading && (
                <span
                    aria-hidden
                    className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
            )}
            {children}
        </button>
    );
}
