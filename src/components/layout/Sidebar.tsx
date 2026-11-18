import { roleNavItems, type SidebarItem } from "../../constant/nav";
import type { SessionUser } from "../../types";
import { LogoutIcon } from "../ui/icons";
import logo from "../../../public/web-logo.png";
import { NotificationBell } from "./NotificationBell";

const cleanPath = (href: string): string =>
    href.split("?")[0].replace(/\/+$/, "") || "/";

const ROLE_LABELS: Record<SessionUser["role"], string> = {
    owner: "Owner",
    staff: "Staff",
};

export function Sidebar(props: {
    user: SessionUser;
    path: string;
    onNavigate: (href: string) => void;
    onLogout: () => void;
    items?: SidebarItem[];
}) {
    const items = props.items ?? roleNavItems(props.user.role);

    const isActive = (href: string): boolean => {
        const current = cleanPath(props.path);
        const target = cleanPath(href);
        return current === target || current.startsWith(`${target}/`);
    };

    return (
        <div className="flex h-full min-h-0 flex-col border-r border-border bg-surface">
            <header className="relative shrink-0 border-b border-border bg-gold-soft/30 px-5 py-5">
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-gold to-transparent" />
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface ring-1 ring-gold/60">
                        <img src={logo} alt="" className="h-full w-full object-cover" />
                    </span>
                    <span className="flex flex-col leading-tight">
                        <span className="font-display text-lg font-semibold text-charcoal">
                            Raheem
                        </span>
                        <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-gold-deep">
                            Make Up Studio
                        </span>
                    </span>
                </div>
            </header>

            <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
                <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-deep">
                    Menu
                </p>
                <ul className="space-y-1">
                    {items.map((item) => (
                        <li key={item.href}>
                            <button
                                type="button"
                                onClick={() => props.onNavigate(item.href)}
                                aria-current={isActive(item.href) ? "page" : undefined}
                                className={
                                    isActive(item.href)
                                        ? "relative flex min-h-11 w-full items-center gap-3 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-card"
                                        : "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-gold-soft/50 hover:text-charcoal"
                                }
                            >
                                {isActive(item.href) && (
                                    <span aria-hidden className="absolute -left-3 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-gold" />
                                )}
                                <span className={isActive(item.href) ? "text-gold-light" : ""}>
                                    {item.icon}
                                </span>
                                {item.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            <footer className="shrink-0 border-t border-border bg-gold-soft/20 p-4">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white ring-2 ring-gold/40">
                        {props.user.username.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-charcoal">
                            {props.user.username}
                        </p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-deep">
                            {ROLE_LABELS[props.user.role]}
                        </p>
                    </div>
                    <NotificationBell />
                    <button
                        type="button"
                        onClick={props.onLogout}
                        aria-label="Sign out"
                        title="Sign out"
                        className="grid min-h-11 min-w-11 place-items-center rounded-lg p-2 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                        <LogoutIcon />
                    </button>
                </div>
            </footer>
        </div>
    );
}
