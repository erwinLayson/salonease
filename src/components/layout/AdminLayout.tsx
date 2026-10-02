import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../../lib/auth";
import { toast } from "../../lib/toast";
import type { SessionUser } from "../../types";
import { AdminHeader } from "./AdminHeader";
import { Sidebar } from "./Sidebar";

const FOCUSABLE =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Master layout for authenticated owner/staff pages: a persistent
 * sidebar (fixed on desktop, slide-over drawer on mobile) around the
 * nested content. The drawer is keyboard-operable: Escape closes it,
 * Tab is trapped while it is open, and focus returns to the menu
 * button on close. When there is no session the chrome is skipped —
 * the nested `ProtectedRoutes` immediately redirect to /login.
 */
export default function AdminLayout(props: {
    user: SessionUser | null;
    onSignedOut: () => void;
}) {
    const navigate = useNavigate();
    const location = useLocation();
    const [navOpen, setNavOpen] = useState(false);
    const menuRef = useRef<HTMLButtonElement>(null);
    const drawerRef = useRef<HTMLElement>(null);
    const hadOpened = useRef(false);

    // Focus into the drawer when it opens; return focus to the menu button on close.
    useEffect(() => {
        if (navOpen) {
            const first = drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE);
            (first ?? drawerRef.current)?.focus();
            hadOpened.current = true;
        } else if (hadOpened.current) {
            menuRef.current?.focus();
            hadOpened.current = false;
        }
    }, [navOpen]);

    /** Sign out, then return to the landing page. */
    const handleLogout = async () => {
        setNavOpen(false);
        try {
            await logout();
            toast.info("Signed out.");
            props.onSignedOut();
            navigate("/");
        } catch {
            // Failures surface as a toast via the axios error interceptor.
        }
    };

    /** Navigate from the sidebar and close the mobile drawer. */
    const handleNavigate = (href: string) => {
        setNavOpen(false);
        navigate(href);
    };

    // While the drawer is open: Escape closes it, Tab cycles inside it.
    const onDrawerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") {
            setNavOpen(false);
            return;
        }
        if (event.key !== "Tab") {
            return;
        }
        const drawer = drawerRef.current;
        if (!drawer) {
            return;
        }
        const nodes = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (nodes.length === 0) {
            return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const current = document.activeElement;
        if (event.shiftKey && (current === first || current === drawer)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && current === last) {
            event.preventDefault();
            first.focus();
        }
    };

    return (
        <div className="min-h-screen">
            {props.user && (
                <>
                    <AdminHeader
                        setMenuRef={(element) => {
                            menuRef.current = element;
                        }}
                        onMenu={() => setNavOpen(true)}
                    />

                    {/* Desktop sidebar */}
                    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
                        <Sidebar
                            user={props.user}
                            path={location.pathname}
                            onNavigate={handleNavigate}
                            onLogout={() => void handleLogout()}
                        />
                    </aside>

                    {/* Mobile slide-over */}
                    <div
                        className={`fixed inset-0 z-50 lg:hidden ${navOpen ? "" : "pointer-events-none"}`}
                        aria-hidden={!navOpen}
                        inert={!navOpen}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Navigation menu"
                        onKeyDown={onDrawerKeyDown}
                    >
                        <div
                            className={`absolute inset-0 bg-charcoal/50 transition-opacity ${navOpen ? "opacity-100" : "opacity-0"}`}
                            onClick={() => setNavOpen(false)}
                        />
                        <aside
                            ref={drawerRef}
                            tabIndex={navOpen ? -1 : undefined}
                            className={`absolute inset-y-0 left-0 w-64 transform transition-transform duration-200 ${navOpen ? "translate-x-0" : "-translate-x-full"}`}
                        >
                            <Sidebar
                                user={props.user}
                                path={location.pathname}
                                onNavigate={handleNavigate}
                                onLogout={() => void handleLogout()}
                            />
                        </aside>
                    </div>
                </>
            )}

            <main className="lg:pl-64">
                <div className="mx-auto max-w-6xl px-4 py-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
