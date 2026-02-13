import { Settings, ListChecks, User, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Only show for owner/admin roles */
  adminOnly?: boolean;
  /** Render as a destructive action (e.g. logout) */
  destructive?: boolean;
}

/**
 * Single source of truth for clinic console navigation.
 * Both desktop header and mobile menu render from this list.
 */
export const consoleNavItems: NavItem[] = [
  {
    label: "الملف الشخصي",
    path: "/clinic-profile",
    icon: User,
  },
  {
    label: "إعدادات قائمة الانتظار",
    path: "/queue-settings",
    icon: ListChecks,
  },
];
