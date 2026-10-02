interface StatusActionProps {
    label: string;
    disabled?: boolean;
    onClick: () => void;
}

export function StatusAction(props: StatusActionProps) {
    return (
        <button
            type="button"
            disabled={props.disabled}
            onClick={props.onClick}
            className="min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-charcoal transition-colors hover:border-primary hover:bg-primary-light/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
            {props.label}
        </button>
    );
}
