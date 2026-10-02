import { useState } from "react";
import { api } from "../../lib/api";
import { Field } from "../../components/ui/Field";

import type { OwnerStaff } from "../../types";

interface StaffFormProps {
    /** Null for create mode; the staff row for edit mode. */
    staff?: OwnerStaff | null;
    onDone: (message: string) => void | Promise<void>;
    onCancel: () => void;
}

const MIN_PASSWORD_LENGTH = 8;

export function StaffForm(props: StaffFormProps) {
    const editing = props.staff ?? null;

    const [form, setForm] = useState({
        firstName: editing?.first_name ?? "",
        lastName: editing?.last_name ?? "",
        position: editing?.position ?? "",
        phone: editing?.phone ?? "",
        email: editing?.email ?? "",
        username: editing?.username ?? "",
        password: "",
    });
    const [busy, setBusy] = useState(false);

    const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

    const passwordProblem =
        form.password !== "" && form.password.length < MIN_PASSWORD_LENGTH
            ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
            : editing === null && form.password === ""
              ? "Password is required"
              : null;

    const canSubmit =
        form.firstName.trim() !== "" &&
        form.lastName.trim() !== "" &&
        (editing !== null || form.username.trim() !== "") &&
        passwordProblem === null;

    const submit = async () => {
        setBusy(true);
        try {
            const payload = {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                position: form.position.trim() || null,
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
            };

            if (editing === null) {
                await api.post("/owner/staff", {
                    ...payload,
                    username: form.username.trim(),
                    password: form.password,
                });
                await props.onDone(
                    `${form.firstName.trim()} ${form.lastName.trim()} added with login "${form.username.trim()}".`
                );
            } else {
                await api.put(`/owner/staff/${editing.id}`, {
                    ...payload,
                    ...(form.password !== "" ? { password: form.password } : {}),
                });
                await props.onDone(
                    `${form.firstName.trim()} ${form.lastName.trim()} updated.`
                );
            }
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field
                    label="First name *"
                    value={form.firstName}
                    onChange={(value) => set({ firstName: value })}
                />
                <Field
                    label="Last name *"
                    value={form.lastName}
                    onChange={(value) => set({ lastName: value })}
                />
                <Field
                    label="Position"
                    value={form.position}
                    onChange={(value) => set({ position: value })}
                    placeholder="e.g. Senior Stylist"
                />
                <Field
                    label="Phone"
                    value={form.phone}
                    onChange={(value) => set({ phone: value })}
                />
                <Field
                    label="Email"
                    value={form.email}
                    onChange={(value) => set({ email: value })}
                    type="email"
                />
                {editing === null ? (
                    <Field
                        label="Username *"
                        value={form.username}
                        onChange={(value) => set({ username: value })}
                    />
                ) : (
                    <div className="block text-sm">
                        <span className="mb-1.5 block font-medium text-charcoal">
                            Username
                        </span>
                        <input
                            type="text"
                            value={form.username}
                            disabled
                            className="w-full rounded-lg border border-border bg-charcoal/5 px-3 py-2 text-sm opacity-60"
                        />
                    </div>
                )}
                <Field
                    label={
                        editing === null
                            ? "Password * (min 8 characters)"
                            : "Password (leave blank to keep current)"
                    }
                    value={form.password}
                    onChange={(value) => set({ password: value })}
                    type="password"
                />
            </div>

            {editing !== null && (
                <p className="mt-2 text-xs text-muted">
                    The username cannot be changed after the account is created.
                </p>
            )}
            {passwordProblem !== null && (
                <p className="mt-2 text-xs text-danger">
                    {passwordProblem}
                </p>
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
                    disabled={busy || !canSubmit} aria-busy={busy} 
                    onClick={() => void submit()}
                    className="rounded-md bg-primary-dark min-h-11 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                    {busy ? "Saving…" : editing === null ? "Create staff member" : "Save changes"}
                </button>
            </div>
        </>
    );
}
