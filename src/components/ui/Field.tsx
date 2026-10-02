import { useId } from "react";

export function Field(props: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
    /** Validation message — rendered with an icon (not colour alone) and wired via aria-describedby. */
    error?: string | null;
    /** Callback ref so callers can focus the input after a failed submit. */
    setInputRef?: (element: HTMLInputElement | null) => void;
}) {
    const id = useId();
    const errorId = `${id}-error`;

    return (
        <label className="block text-sm" htmlFor={id}>
            <span className="mb-1.5 block font-medium text-charcoal">
                {props.label}
            </span>
            <input
                id={id}
                ref={(element) => props.setInputRef?.(element)}
                type={props.type ?? "text"}
                value={props.value}
                placeholder={props.placeholder}
                aria-invalid={props.error ? true : undefined}
                aria-describedby={props.error ? errorId : undefined}
                onChange={(event) => props.onChange(event.target.value)}
                className={`w-full min-h-11 rounded-lg border bg-surface px-3 py-2 text-sm outline-none transition placeholder:text-muted focus:ring-2 ${
                    props.error
                        ? "border-danger focus:border-danger focus:ring-danger/30"
                        : "border-border focus:border-primary focus:ring-primary/40"
                }`}
            />
            {props.error && (
                <span
                    id={errorId}
                    className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger"
                >
                    <span aria-hidden>!</span>
                    {props.error}
                </span>
            )}
        </label>
    );
}
