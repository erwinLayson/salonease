import { useState } from "react";
import { api } from "../../lib/api";
import { toast } from "../../lib/toast";
import { fileToImageDataUrl } from "../../lib/image";
import { Field } from "../../components/ui/Field";

import type { OwnerService } from "../../types";

interface ServiceFormProps {
    /** Null for create mode; the service row for edit mode. */
    service?: OwnerService | null;
    onDone: (message: string) => void | Promise<void>;
    onCancel: () => void;
}

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_DURATION_MINUTES = 24 * 60;
/** Matches the server's slot granularity (15 minutes). */
const SLOT_GRANULARITY_MINUTES = 15;

export function ServiceForm(props: ServiceFormProps) {
    const editing = props.service ?? null;

    const [form, setForm] = useState({
        name: editing?.name ?? "",
        description: editing?.description ?? "",
        price: editing ? String(editing.price) : "",
        durationMinutes: editing ? String(editing.duration_minutes) : "",
        image: editing?.image ?? "",
    });
    const [busy, setBusy] = useState(false);
    const [imageBusy, setImageBusy] = useState(false);

    const set = (patch: Partial<typeof form>) =>
        setForm((f) => ({ ...f, ...patch }));

    const handleImageChange = async (file: File | undefined) => {
        if (!file) return;
        setImageBusy(true);
        try {
            const dataUrl = await fileToImageDataUrl(file, 800);
            set({ image: dataUrl });
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Could not process that image."
            );
        } finally {
            setImageBusy(false);
        }
    };

    const nameProblem =
        form.name.trim() === ""
            ? "Name is required"
            : form.name.trim().length > MAX_NAME_LENGTH
              ? `Name must be ${MAX_NAME_LENGTH} characters or fewer`
              : null;

    const descriptionProblem =
        form.description.length > MAX_DESCRIPTION_LENGTH
            ? `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`
            : null;

    const priceValue = Number(form.price);
    const priceProblem =
        form.price === "" || Number.isNaN(priceValue) || priceValue < 0
            ? "Price must be 0 or more"
            : Math.abs(Math.round(priceValue * 100) - priceValue * 100) > 1e-9
              ? "Price can have at most 2 decimal places"
              : null;

    const durationValue = Number(form.durationMinutes);
    const durationProblem =
        form.durationMinutes === "" ||
        Number.isNaN(durationValue) ||
        !Number.isInteger(durationValue) ||
        durationValue <= 0
            ? "Duration must be a whole number of minutes"
            : durationValue > MAX_DURATION_MINUTES
              ? `Duration must be ${MAX_DURATION_MINUTES} minutes or fewer`
              : durationValue % SLOT_GRANULARITY_MINUTES !== 0
                ? `Duration must be a multiple of ${SLOT_GRANULARITY_MINUTES} minutes`
                : null;

    const imageProblem =
        editing === null && !form.image
            ? "Service image is required when creating a service"
            : null;

    const canSubmit =
        nameProblem === null &&
        descriptionProblem === null &&
        priceProblem === null &&
        durationProblem === null &&
        imageProblem === null;

    const submit = async () => {
        setBusy(true);
        try {
            const payload = {
                name: form.name.trim(),
                description: form.description.trim() || null,
                price: priceValue,
                durationMinutes: durationValue,
                image: form.image || null,
            };

            if (editing === null) {
                await api.post("/owner/services", payload);
                await props.onDone(`${payload.name} added.`);
            } else {
                await api.put(`/owner/services/${editing.id}`, payload);
                await props.onDone(`${payload.name} updated.`);
            }
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setBusy(false);
        }
    };

    const problems = [
        nameProblem,
        descriptionProblem,
        priceProblem,
        durationProblem,
        imageProblem,
    ].filter((problem) => problem !== null);

    return (
        <>
            <div className="grid gap-3">
                {/* Service image upload area */}
                <div>
                    <span className="mb-1.5 block text-sm font-medium text-charcoal">
                        Service image {editing === null ? "*" : "(optional)"}
                    </span>
                    {form.image ? (
                        <div className="relative overflow-hidden rounded-xl border border-border bg-charcoal/5">
                            <img
                                src={form.image}
                                alt="Service preview"
                                className="h-44 w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-charcoal/40 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100">
                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-charcoal shadow hover:bg-slate-50 transition">
                                    <span>{imageBusy ? "Processing…" : "Change image"}</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="sr-only"
                                        disabled={imageBusy}
                                        onChange={(e) => void handleImageChange(e.target.files?.[0])}
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={() => set({ image: "" })}
                                    className="inline-flex items-center rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-danger-hover transition"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label
                            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface p-5 text-center transition hover:border-primary hover:bg-primary-light/10 ${
                                imageBusy ? "cursor-wait opacity-60" : "cursor-pointer"
                            }`}
                        >
                            <svg
                                className="h-8 w-8 text-muted"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                <circle cx="9" cy="9" r="2" />
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-charcoal">
                                    {imageBusy ? "Processing image…" : "Click to upload service image *"}
                                </p>
                                <p className="mt-0.5 text-xs text-muted">
                                    PNG, JPG, or WebP. Automatically resized and optimized.
                                </p>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                disabled={imageBusy}
                                onChange={(e) => {
                                    void handleImageChange(e.target.files?.[0]);
                                    e.target.value = "";
                                }}
                            />
                        </label>
                    )}
                </div>

                <Field
                    label="Name *"
                    value={form.name}
                    onChange={(value) => set({ name: value })}
                    placeholder="e.g. Hair Styling"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                        label="Price (₱) *"
                        value={form.price}
                        onChange={(value) => set({ price: value })}
                        type="number"
                    />
                    <Field
                        label="Duration (minutes) *"
                        value={form.durationMinutes}
                        onChange={(value) => set({ durationMinutes: value })}
                        type="number"
                    />
                </div>
                <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-charcoal">
                        Description
                    </span>
                    <textarea
                        value={form.description}
                        onChange={(event) =>
                            set({ description: event.target.value })
                        }
                        rows={3}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/40"
                    />
                </label>
                <p className="text-xs text-muted">
                    Durations must be a multiple of {SLOT_GRANULARITY_MINUTES}{" "}
                    minutes so they fit the booking slots.
                </p>
            </div>

            {problems.length > 0 && (
                <ul className="mt-3 space-y-1">
                    {problems.map((problem) => (
                        <li
                            key={problem}
                            className="text-xs text-danger"
                        >
                            {problem}
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-4 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={props.onCancel}
                    className="rounded-md border border-border min-h-11 px-4 py-2 text-sm"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={busy || imageBusy || !canSubmit} aria-busy={busy || imageBusy} 
                    onClick={() => void submit()}
                    className="rounded-md bg-primary-dark min-h-11 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                    {busy ? "Saving…" : editing === null ? "Create service" : "Save changes"}
                </button>
            </div>
        </>
    );
}
