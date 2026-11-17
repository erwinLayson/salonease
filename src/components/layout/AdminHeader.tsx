import { MenuIcon } from "../ui/icons";
import logo from "../../../public/company-logo.png";

export function AdminHeader(props: {
    setMenuRef?: (element: HTMLButtonElement | null) => void;
    onMenu: () => void;
}) {
    return (
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
            <button
                ref={(element) => props.setMenuRef?.(element)}
                type="button"
                onClick={props.onMenu}
                aria-label="Open navigation menu"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-charcoal transition-colors hover:bg-gold-soft/60"
            >
                <MenuIcon />
            </button>
            <span className="flex flex-1 items-center justify-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-gold/60">
                    <img src={logo} alt="" className="h-full w-full object-cover" />
                </span>
                <span className="font-display text-lg font-semibold text-charcoal">
                    Raheem <span className="text-gold-deep">·</span> Studio
                </span>
            </span>
        </header>
    );
}
