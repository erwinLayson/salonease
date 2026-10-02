import { useState } from "react";
import { errorMessage } from "../lib/api";
import { login } from "../lib/auth";
import { toast } from "../lib/toast";

// Types
import type { SessionUser } from "../types";

// UI components
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { Field } from "../components/ui/Field";

export default function LoginPage(props: { onLoggedIn: (user: SessionUser) => void }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            const user = await login(username, password);
            toast.success("Signed in.");
            props.onLoggedIn(user);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mx-auto max-w-md px-4 py-16">
            <header className="mb-8 flex flex-col items-center text-center">
                <span
                    aria-hidden
                    className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-lg font-bold text-white shadow-lift"
                >
                    R
                </span>
                <h1 className="text-2xl font-semibold tracking-tight">SalonEase staff login</h1>
                <p className="mt-2 text-sm text-muted">
                    Raheem Make Up Studio and Salon
                </p>
            </header>

            <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
                <ErrorBanner message={error} />

                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void submit();
                    }}
                >
                    <Field label="Username" value={username} onChange={setUsername} />
                    <Field
                        label="Password"
                        value={password}
                        onChange={setPassword}
                        type="password"
                    />
                    <button
                        type="submit"
                        disabled={busy || !username || !password} aria-busy={busy} 
                        className="mt-1 min-h-11 rounded-lg bg-primary-dark px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-press disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {busy ? "Signing in…" : "Sign in"}
                    </button>
                </form>
            </div>

            <p className="mt-6 text-center text-xs text-muted">
                Customers book appointments{" "}
                <a className="font-medium text-primary-dark underline hover:text-primary-dark" href="/">
                    here
                </a>
                .
            </p>
        </div>
    );
}
