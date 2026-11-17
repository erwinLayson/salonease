import { useState } from "react";
import { errorMessage } from "../lib/api";
import { login } from "../lib/auth";
import { toast } from "../lib/toast";
import company_logo from "../../public/web-logo.png";

import type { SessionUser } from "../types";

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
        <main className="flex min-h-svh items-center justify-center bg-gold-soft/40 px-5 py-12">
            <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-border bg-surface shadow-lift md:grid-cols-2">
                <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary-dark p-10 text-white md:flex">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full border border-gold/20"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/40 blur-2xl"
                    />
                    <div className="relative flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-surface ring-1 ring-gold/60">
                            <img src={company_logo} alt="" className="h-full w-full object-cover" />
                        </span>
                        <span className="font-display text-xl leading-tight">
                            Raheem Make Up Studio
                        </span>
                    </div>
                    <div className="relative">
                        <div className="flex items-center gap-3">
                            <span aria-hidden className="h-px w-8 bg-gold" />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-light">
                                Staff portal
                            </p>
                        </div>
                        <h1 className="mt-5 text-5xl leading-tight text-white">
                            Your studio,
                            <br />
                            <span className="italic text-gold-light">beautifully organised.</span>
                        </h1>
                        <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/70">
                            Appointments and schedules — all in one calm place.
                        </p>
                    </div>
                    <p className="relative text-[11px] uppercase tracking-widest text-white/50">
                        © {new Date().getFullYear()} SalonEase
                    </p>
                </aside>

                <section className="p-8 sm:p-12">
                    <div className="mb-8">
                        <p className="eyebrow">Welcome back</p>
                        <h2 className="mt-2 text-4xl text-charcoal">Sign in</h2>
                        <p className="mt-2 text-sm text-muted">
                            Use your staff or owner credentials.
                        </p>
                    </div>

                    <ErrorBanner message={error} />

                    <form
                        className="grid gap-5"
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
                            disabled={busy || !username || !password}
                            aria-busy={busy}
                            className="mt-2 min-h-12 rounded-lg bg-primary px-5 py-3 text-sm font-semibold tracking-wide text-white shadow-card transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {busy ? "Signing in…" : "Sign in"}
                        </button>
                    </form>

                    <p className="mt-8 border-t border-border pt-6 text-center text-xs text-muted">
                        Customers book appointments{" "}
                        <a className="font-semibold text-primary hover:text-gold-deep" href="/">
                            here
                        </a>
                        .
                    </p>
                </section>
            </div>
        </main>
    );
}
