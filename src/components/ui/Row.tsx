export function Row(props: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4 border-b border-border py-1.5 last:border-0">
            <dt className="text-muted">{props.label}</dt>
            <dd className="text-right font-medium">{props.value}</dd>
        </div>
    );
}
