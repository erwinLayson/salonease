import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary:
        "bg-primary text-white shadow-card hover:bg-primary-dark active:bg-primary-press",
    secondary:
        "border border-border-strong bg-surface text-charcoal hover:border-gold hover:bg-gold-soft/40 active:bg-gold-soft",
    ghost: "text-charcoal hover:bg-gold-soft/50 active:bg-gold-soft",
    danger:
        "border border-danger-line bg-surface text-danger hover:bg-danger-bg active:bg-danger-line/60",
    gold: "bg-gold text-ink shadow-card hover:bg-gold-light active:bg-gold",
};

export function Button({
    variant = "primary",
    loading = false,
    children,
    className,
    disabled,
    ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    loading?: boolean;
    children: ReactNode;
}) {
    return (
        <button
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-medium tracking-wide transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${className ?? ""}`}
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
