import { roleNavItems, type SidebarItem } from "../../constant/nav";
import type { SessionUser } from "../../types";
import { LogoutIcon } from "../ui/icons";

const cleanPath = (href: string): string =>
    href.split("?")[0].replace(/\/+$/, "") || "/";

const ROLE_LABELS: Record<SessionUser["role"], string> = {
    owner: "Owner",
    staff: "Staff",
};

/**
 * Reusable dashboard sidebar: brand, role navigation and the signed-in
 * user card. Renders full-height — the layout decides how it is placed
 * (fixed panel on desktop, slide-over drawer on mobile).
 */
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
        <div className="flex h-full flex-col border-r border-border bg-surface">
            <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white shadow-sm">
                    R
                </span>
                <span className="text-sm font-semibold tracking-tight">
                    Raheem Make Up Studio{" "}
                    <span className="hidden xl:inline">and Salon</span>
                </span>
            </div>

            <nav className="flex-1 px-3 py-3">
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
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
                                        ? "flex min-h-11 w-full items-center gap-3 rounded-lg bg-primary-dark px-3 py-2 text-sm font-medium text-white shadow-sm"
                                        : "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-charcoal/5 hover:text-charcoal"
                                }
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="border-t border-border p-4">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-charcoal">
                        {props.user.username.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                            {props.user.username}
                        </p>
                        <p className="text-xs text-muted">
                            {ROLE_LABELS[props.user.role]}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={props.onLogout}
                        aria-label="Sign out"
                        title="Sign out"
                        className="grid min-h-11 min-w-11 place-items-center rounded-md p-2 text-muted transition-colors hover:bg-charcoal/5 hover:text-charcoal"
                    >
                        <LogoutIcon />
                    </button>
                </div>
            </div>
        </div>
    );
}
