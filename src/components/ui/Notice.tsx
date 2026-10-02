export function Notice(props: { message: string | null }) {
    if (!props.message) {
        return null;
    }
    return (
        <div
            role="status"
            className="mb-4 flex items-start gap-2.5 rounded-xl border border-success-line bg-success-bg px-4 py-3 text-sm text-success"
        >
            <span
                aria-hidden
                className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success text-[11px] font-bold text-white"
            >
                ✓
            </span>
            <p>{props.message}</p>
        </div>
    );
}
