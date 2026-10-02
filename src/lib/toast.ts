import { useSyncExternalStore } from "react";

export type ToastKind = "success" | "error" | "info";

export interface Toast {
    id: number;
    kind: ToastKind;
    message: string;
}

/**
 * Module-level toast store: the axios interceptor (which runs outside
 * React) can push toasts, while any component reads them through
 * `useToasts()`. State lives outside React so both sides share it.
 */
let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

const emit = () => {
    for (const listener of listeners) {
        listener();
    }
};

export function pushToast(kind: ToastKind, message: string): void {
    toasts = [...toasts, { id: nextId, kind, message }];
    nextId += 1;
    emit();
}

export function dismissToast(id: number): void {
    toasts = toasts.filter((toast) => toast.id !== id);
    emit();
}

/** Imperative helpers used across the app: `toast.success("Saved.")`. */
export const toast = {
    success: (message: string) => pushToast("success", message),
    error: (message: string) => pushToast("error", message),
    info: (message: string) => pushToast("info", message),
};

const subscribe = (onChange: () => void) => {
    listeners.add(onChange);
    return () => {
        listeners.delete(onChange);
    };
};

const getSnapshot = (): Toast[] => toasts;

/** Re-renders the calling component whenever the toast list changes. */
export function useToasts(): Toast[] {
    return useSyncExternalStore(subscribe, getSnapshot);
}
