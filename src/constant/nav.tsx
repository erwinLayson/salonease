import type { ReactNode } from "react";

import {
    BoxIcon,
    CalendarIcon,
    EventIcon,
    ClockIcon,
    QueueIcon,
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
              { href: "/owner/queue", label: "Walk-in queue", icon: <QueueIcon /> },
              { href: "/owner/schedule", label: "Schedule", icon: <ClockIcon /> },
              { href: "/owner/staff", label: "Staff", icon: <UsersIcon /> },
              {
                  href: "/owner/services",
                  label: "Services",
                  icon: <ScissorsIcon />,
              },
              { href: "/owner/events", label: "Events", icon: <EventIcon /> },
              { href: "/owner/inventory", label: "Inventory", icon: <BoxIcon /> },
              {
                  href: "/owner/transactions",
                  label: "Transactions",
                  icon: <ReceiptIcon />,
              },              { href: "/owner/reports",
                  label: "Reports",
                  icon: <TrendingUpIcon />,
              },
              { href: "/owner/commission-rules",
                  label: "Commission rules",
                  icon: <TrendingUpIcon />,
              },
              { href: "/owner/commissions",
                  label: "Payouts",
                  icon: <ReceiptIcon />,
              },
              { href: "/owner/daily-close",
                  label: "Daily close",
                  icon: <ClockIcon />,
              },
              { href: "/account", label: "Account", icon: <SettingsIcon /> },
          ]
        : [
              {
                  href: "/staff/appointments",
                  label: "My Appointments",
                  icon: <CalendarIcon />,
              },
              { href: "/staff/schedule", label: "Schedule", icon: <ClockIcon /> },
              { href: "/staff/events", label: "My events", icon: <EventIcon /> },              { href: "/staff/transactions",
                  label: "Transactions",
                  icon: <ReceiptIcon />,
              },
              {
                  href: "/staff/commissions",
                  label: "My commissions",
                  icon: <TrendingUpIcon />,
              },
              { href: "/account", label: "Account", icon: <SettingsIcon /> },
          ];
}
