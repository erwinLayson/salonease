export function BackButton(props: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={props.onClick}
            className="rounded-lg border border-border min-h-11 px-4 py-2 text-sm transition hover:bg-charcoal/5"
        >
            ← Back
        </button>
    );
}
