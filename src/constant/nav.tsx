import type { ReactNode } from "react";

import {
    CalendarIcon,
    ClockIcon,
    ReceiptIcon,
    ScissorsIcon,
    SettingsIcon,
    TrendingUpIcon,
    UsersIcon,
} from "../components/ui/icons";
import type { Role } from "../types";

export interface SidebarItem {
    href: string;
    label: string;
    icon?: ReactNode;
}

/** Default sidebar navigation per role — layouts may pass their own items. */
export function roleNavItems(role: Role): SidebarItem[] {
    return role === "owner"
        ? [
              {
                  href: "/owner/appointments",
                  label: "Appointments",
                  icon: <CalendarIcon />,
              },
              { href: "/owner/schedule", label: "Schedule", icon: <ClockIcon /> },
              { href: "/owner/staff", label: "Staff", icon: <UsersIcon /> },
              {
                  href: "/owner/services",
                  label: "Services",
                  icon: <ScissorsIcon />,
              },
              {
                  href: "/owner/transactions",
                  label: "Transactions",
                  icon: <ReceiptIcon />,
              },
              {
                  href: "/owner/reports",
                  label: "Reports",
                  icon: <TrendingUpIcon />,
              },
              { href: "/account", label: "Account", icon: <SettingsIcon /> },
          ]
        : [
              {
                  href: "/staff/appointments",
                  label: "My Appointments",
                  icon: <CalendarIcon />,
              },
              {
                  href: "/staff/transactions",
                  label: "Transactions",
                  icon: <ReceiptIcon />,
              },
              { href: "/account", label: "Account", icon: <SettingsIcon /> },
          ];
}
