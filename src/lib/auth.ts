import { api } from "./api";

// Types
import type { SessionUser } from "../types";

/** Returns the signed-in user, or null when there is no valid session. */
export const getCurrentUser = async (): Promise<SessionUser | null> => {
    try {
        // Anonymous visitors get a 401 here on every page load — that
        // is expected, so it must not raise the global error toast.
        const res = await api.get<{ user: SessionUser }>("/auth/me", {
            skipErrorToast: true,
        });
        return res.data.user;
    } catch {
        return null;
    }
};

/** Signs in an owner/staff user (the session is an httpOnly cookie). */
export const login = async (username: string, password: string): Promise<SessionUser> => {
    // A failed sign-in is a form-level error shown inline on the login
    // page, so it must not also raise the global error toast.
    const res = await api.post<{ user: SessionUser }>(
        "/auth/login",
        { username, password },
        { skipErrorToast: true }
    );
    return res.data.user;
};

/** Clears the session. */
export const logout = async (): Promise<void> => {
    await api.post("/auth/logout");
};

/**
 * Fired on `window` after the session's credentials change, so the app can
 * re-fetch `/auth/me` and refresh the displayed user.
 */
export const AUTH_CHANGED_EVENT = "auth:changed";
