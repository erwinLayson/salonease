export function Row(props: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4 border-b border-dashed border-border py-2 last:border-0">
            <dt className="text-muted">{props.label}</dt>
            <dd className="text-right font-semibold text-charcoal">{props.value}</dd>
        </div>
    );
}
