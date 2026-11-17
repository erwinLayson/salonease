export function BackButton(props: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={props.onClick}
            className="min-h-11 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-charcoal transition hover:border-gold hover:bg-gold-soft/40"
        >
            ← Back
        </button>
    );
}
