import { useSyncExternalStore } from "react";

export type ToastKind = "success" | "error" | "info" | "warning";

export interface ToastOptions {
    title?: string;
    duration?: number;
}

export interface Toast {
    id: number;
    kind: ToastKind;
    message: string;
    title?: string;
    duration?: number;
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

export function pushToast(
    kind: ToastKind,
    message: string,
    options?: ToastOptions
): void {
    const id = nextId++;
    toasts = [
        ...toasts,
        {
            id,
            kind,
            message,
            title: options?.title,
            duration: options?.duration,
        },
    ];
    emit();
}

export function dismissToast(id: number): void {
    toasts = toasts.filter((toast) => toast.id !== id);
    emit();
}

export function clearToasts(): void {
    toasts = [];
    emit();
}

/** Imperative helpers used across the app: `toast.success("Saved.")`. */
export const toast = {
    success: (message: string, options?: ToastOptions) =>
        pushToast("success", message, options),
    error: (message: string, options?: ToastOptions) =>
        pushToast("error", message, options),
    info: (message: string, options?: ToastOptions) =>
        pushToast("info", message, options),
    warning: (message: string, options?: ToastOptions) =>
        pushToast("warning", message, options),
    dismiss: (id: number) => dismissToast(id),
    clear: () => clearToasts(),
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
