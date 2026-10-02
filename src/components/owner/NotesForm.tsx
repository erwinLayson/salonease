import { useState } from "react";
import { api } from "../../lib/api";

import type { AppointmentDetail } from "../../types";

interface NotesFormProps {
    appointment: AppointmentDetail;
    onClose: () => void;
    onDone: (message: string) => void | Promise<void>;
}

export function NotesForm(props: NotesFormProps) {
    const [notes, setNotes] = useState(props.appointment.notes ?? "");
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setBusy(true);
        try {
            await api.patch(`/owner/appointments/${props.appointment.id}`, { notes });
            await props.onDone(`Notes updated for ${props.appointment.reference}.`);
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={props.onClose}
                    className="rounded-md border border-border min-h-11 px-4 py-2 text-sm"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={busy} aria-busy={busy}
                    onClick={() => void submit()}
                    className="rounded-md bg-primary-dark min-h-11 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                    {busy ? "Saving…" : "Save notes"}
                </button>
            </div>
        </>
    );
}
