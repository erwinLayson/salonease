export function Select(props: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
}) {
    return (
        <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                {props.label}
            </span>
            <select
                value={props.value}
                onChange={(event) => props.onChange(event.target.value)}
                className="w-full min-h-11 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-charcoal outline-none transition hover:border-border-strong focus:border-gold focus:ring-2 focus:ring-gold/30"
            >
                {props.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}
