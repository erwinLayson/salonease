import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FiArrowRight,
    FiBell,
    FiCalendar,
    FiCheck,
    FiCheckCircle,
    FiPackage,
} from "react-icons/fi";

import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/utils";
import { Modal } from "../ui/Modal";
import { BellIcon } from "../ui/icons";
import type { InAppNotification, InAppNotificationType, NotificationInbox } from "../../types";

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getNotificationIcon(type: InAppNotificationType) {
    switch (type) {
        case "low_stock":
            return {
                icon: <FiPackage size={16} />,
                badgeClass: "bg-warning-bg/80 text-warning border-warning-line",
            };
        case "event_assigned":
        case "event_changed":
            return {
                icon: <FiCalendar size={16} />,
                badgeClass: "bg-blue-50 text-blue-600 border-blue-200",
            };
        default:
            return {
                icon: <FiBell size={16} />,
                badgeClass: "bg-charcoal/5 text-charcoal border-border",
            };
    }
}

/** Bell button + inbox modal used in the sidebar user area. */
export function NotificationBell() {
    const navigate = useNavigate();
    const [inbox, setInbox] = useState<NotificationInbox | null>(null);
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const [markingAll, setMarkingAll] = useState(false);

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

    const handleMarkSingleRead = async (e: React.MouseEvent, item: InAppNotification) => {
        e.stopPropagation();
        try {
            await api.patch(`/notifications/${item.id}/read`);
            await reload();
        } catch {
            // toast via interceptor
        }
    };

    const handleMarkAllRead = async () => {
        const unreadItems = inbox?.items.filter((i) => !i.readAt) ?? [];
        if (unreadItems.length === 0) return;
        setMarkingAll(true);
        try {
            await Promise.all(
                unreadItems.map((item) => api.patch(`/notifications/${item.id}/read`))
            );
            await reload();
        } catch {
            // toast via interceptor
        } finally {
            setMarkingAll(false);
        }
    };

    const unread = inbox?.unread ?? 0;
    const allItems = inbox?.items ?? [];
    const displayedItems =
        filter === "unread" ? allItems.filter((i) => !i.readAt) : allItems;

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
                    <div className="space-y-4">
                        {/* Action Bar: Filters + Mark All Read */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setFilter("all")}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                        filter === "all"
                                            ? "bg-charcoal text-white"
                                            : "bg-charcoal/5 text-muted hover:bg-charcoal/10 hover:text-charcoal"
                                    }`}
                                >
                                    All ({allItems.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilter("unread")}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                        filter === "unread"
                                            ? "bg-primary text-white"
                                            : "bg-charcoal/5 text-muted hover:bg-charcoal/10 hover:text-charcoal"
                                    }`}
                                >
                                    Unread ({unread})
                                </button>
                            </div>

                            {unread > 0 && (
                                <button
                                    type="button"
                                    onClick={() => void handleMarkAllRead()}
                                    disabled={markingAll}
                                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5 transition-colors disabled:opacity-40"
                                >
                                    <FiCheck size={14} />
                                    <span>{markingAll ? "Marking..." : "Mark all as read"}</span>
                                </button>
                            )}
                        </div>

                        {/* Notifications List */}
                        {displayedItems.length === 0 ? (
                            <div className="py-10 text-center">
                                <div className="mx-auto mb-2.5 grid h-10 w-10 place-items-center rounded-full bg-charcoal/5 text-muted">
                                    {filter === "unread" ? (
                                        <FiCheckCircle size={20} className="text-success" />
                                    ) : (
                                        <FiBell size={20} />
                                    )}
                                </div>
                                <p className="text-sm font-semibold text-charcoal">
                                    {filter === "unread"
                                        ? "All caught up!"
                                        : "No notifications yet"}
                                </p>
                                <p className="mt-1 text-xs text-muted">
                                    {filter === "unread"
                                        ? "You have no unread notifications."
                                        : "When system alerts or stock updates occur, they'll appear here."}
                                </p>
                            </div>
                        ) : (
                            <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-0.5">
                                {displayedItems.map((item) => {
                                    const { icon, badgeClass } = getNotificationIcon(item.type);
                                    const isUnread = !item.readAt;

                                    return (
                                        <li key={item.id}>
                                            <div
                                                onClick={() => void handleOpen(item)}
                                                className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                                                    isUnread
                                                        ? "border-border bg-surface hover:border-primary/40 hover:bg-primary/[0.02] shadow-xs"
                                                        : "border-border/60 bg-charcoal/[0.015] hover:bg-charcoal/[0.03]"
                                                }`}
                                            >
                                                {/* Icon Badge */}
                                                <div
                                                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${badgeClass}`}
                                                >
                                                    {icon}
                                                </div>

                                                {/* Content */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p
                                                            className={`text-sm leading-snug ${
                                                                isUnread
                                                                    ? "font-semibold text-charcoal"
                                                                    : "font-medium text-charcoal/80"
                                                            }`}
                                                        >
                                                            {item.title}
                                                        </p>
                                                        <span
                                                            className="shrink-0 text-[11px] text-muted whitespace-nowrap"
                                                            title={formatDateTime(item.createdAt)}
                                                        >
                                                            {formatRelativeTime(item.createdAt)}
                                                        </span>
                                                    </div>

                                                    <p className="mt-1 text-xs leading-relaxed text-muted line-clamp-2">
                                                        {item.body}
                                                    </p>

                                                    {item.link && (
                                                        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:underline">
                                                            <span>View details</span>
                                                            <FiArrowRight size={11} />
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Unread indicator / Quick action */}
                                                {isUnread && (
                                                    <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                                                        <span
                                                            className="h-2 w-2 rounded-full bg-primary-dark"
                                                            title="Unread"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => void handleMarkSingleRead(e, item)}
                                                            title="Mark as read"
                                                            className="rounded-md p-1 text-muted opacity-0 group-hover:opacity-100 hover:bg-charcoal/10 hover:text-charcoal transition-all"
                                                        >
                                                            <FiCheck size={13} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </Modal>
            )}
        </>
    );
}
