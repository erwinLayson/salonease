import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/utils";
import { Modal } from "../ui/Modal";
import { BellIcon } from "../ui/icons";
import type { InAppNotification, NotificationInbox } from "../../types";

const SEVERITY_STYLES: Record<InAppNotification["severity"], string> = {
    info: "border-border",
    warning: "border-warning-line bg-warning-bg/30",
    critical: "border-danger-line bg-danger-bg/30",
};

/** Bell button + inbox modal used in the sidebar user area. */
export function NotificationBell() {
    const navigate = useNavigate();
    const [inbox, setInbox] = useState<NotificationInbox | null>(null);
    const [open, setOpen] = useState(false);

    const reload = useCallback(async () => {
        try {
            const res = await api.get<{ data: NotificationInbox }>("/notifications", {
                skipErrorToast: true,
            });
            setInbox(res.data.data);
        } catch {
            // The bell is non-critical; keep the last known inbox.
        }
    }, []);

    useEffect(() => {
        void reload();
        const timer = window.setInterval(() => void reload(), 30_000);
        return () => window.clearInterval(timer);
    }, [reload]);

    const handleOpen = async (item: InAppNotification) => {
        try {
            if (!item.readAt) {
                await api.patch(`/notifications/${item.id}/read`);
            }
        } catch {
            // toast via interceptor
        }
        setOpen(false);
        await reload();
        if (item.link) {
            navigate(item.link);
        }
    };

    const unread = inbox?.unread ?? 0;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
                title="Notifications"
                className="relative grid min-h-11 min-w-11 place-items-center rounded-md p-2 text-muted transition-colors hover:bg-charcoal/5 hover:text-charcoal"
            >
                <BellIcon />
                {unread > 0 && (
                    <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary-dark px-1 text-[10px] font-semibold text-white">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <Modal title="Notifications" onClose={() => setOpen(false)}>
                    {(inbox?.items.length ?? 0) === 0 ? (
                        <p className="py-8 text-center text-sm text-muted">
                            No notifications yet.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {(inbox?.items ?? []).map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onClick={() => void handleOpen(item)}
                                        className={`w-full rounded-xl border p-3 text-left transition-colors hover:bg-charcoal/5 ${SEVERITY_STYLES[item.severity]}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-medium">
                                                {item.title}
                                            </p>
                                            {!item.readAt && (
                                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-dark" />
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-muted">{item.body}</p>
                                        <p className="mt-1.5 text-[11px] text-muted">
                                            {formatDateTime(item.createdAt)}
                                        </p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Modal>
            )}
        </>
    );
}
