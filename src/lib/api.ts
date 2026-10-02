import axios from "axios";
import { toast } from "./toast";
import { getEnv } from "./env";

// In development the SPA and API share an origin: Vite proxies /api to the
// server (target read from VITE_API_URL in .env — see vite.config.ts). In
// production VITE_API_URL points at the deployed API, which may be a different
// site; `withCredentials: true` sends/receives the httpOnly session cookie
// there, and the server sets it `SameSite=None; Secure` (see
// server/src/config/auth.ts) so cross-site requests keep the session.
const apiUse = getEnv("VITE_API_URL");

export const api = axios.create({ baseURL: apiUse, withCredentials: true });

// Per-request opt-out for the global error toast below (e.g. the
// anonymous session probe, which expects a 401 on every page load).
declare module "axios" {
    export interface AxiosRequestConfig {
        skipErrorToast?: boolean;
    }
}

export interface ConflictBody {
    message?: string;
    alternatives?: string[];
}

/** Human-readable message from any thrown error. */
export const errorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string } | undefined;
        return data?.message ?? error.message;
    }
    return error instanceof Error ? error.message : "Something went wrong.";
};

/** Alternative slots returned with a 409 booking conflict. */
export const conflictAlternatives = (error: unknown): string[] => {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
        const data = error.response.data as ConflictBody | undefined;
        return data?.alternatives ?? [];
    }
    return [];
};

/** Copies text to the clipboard, falling back to a temporary input. */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
};

// Global error capture: every failed request surfaces as an error toast,
// so callers no longer need per-page error banners. Requests that expect
// or handle their own failures pass `skipErrorToast: true`.
api.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        const skip = axios.isAxiosError(error)
            ? Boolean(error.config?.skipErrorToast)
            : false;
        if (!skip) {
            toast.error(errorMessage(error));
        }
        return Promise.reject(error);
    }
);
