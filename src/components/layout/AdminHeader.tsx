import { MenuIcon } from "../ui/icons";
import logo from "../../../public/company-logo.png";

/**
 * Compact top bar for small screens: menu toggle + brand.
 * Hidden on desktop (`lg`), where the fixed sidebar takes over.
 * Sign out lives in the drawer's user card, not this bar.
 */
export function AdminHeader(props: {
    setMenuRef?: (element: HTMLButtonElement | null) => void;
    onMenu: () => void;
}) {
    return (
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur lg:hidden">
            <button
                ref={(element) => props.setMenuRef?.(element)}
                type="button"
                onClick={props.onMenu}
                aria-label="Open navigation menu"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-charcoal transition-colors hover:bg-charcoal/5"
            >
                <MenuIcon />
            </button>
            <span className="flex flex-1 items-center justify-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full">
                    <img src={logo} alt="" className="h-full w-full object-cover" />
                </span>
                <span className="text-sm font-semibold tracking-tight text-charcoal">
                    Raheem Make Up Studio
                </span>
            </span>
        </header>
    );
}
