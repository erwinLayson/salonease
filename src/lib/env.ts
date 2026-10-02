// Vite only exposes variables prefixed with `VITE_` to the browser bundle,
// so every name passed here must carry that prefix (e.g. `VITE_API_URL`).
// Reads `import.meta.env` dynamically, which works in dev and build because
// Vite injects the whole (prefixed) env object into the bundle.
const read = (name: string): string | undefined => {
    const value = (import.meta.env as Record<string, string | undefined>)[name];
    return typeof value === "string" && value.length > 0 ? value : undefined;
};

/**
 * Reads a client-side environment variable.
 *
 * Throws when the variable is missing/empty and no `fallback` is given, so
 * required config fails loudly instead of surfacing later as a broken request.
 * Pass a fallback for optional variables, e.g. `getEnv("VITE_API_URL", "/api")`.
 */
export const getEnv = (name: string, fallback?: string): string => {
    const value = read(name);

    if (value === undefined) {
        if (fallback !== undefined) {
            return fallback;
        }
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
};

/** Reads an optional environment variable, or `undefined` when not set. */
export const getOptionalEnv = (name: string): string | undefined => read(name);
