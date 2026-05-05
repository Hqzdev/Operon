"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Analytics01Icon,
  CreditCardIcon,
  DashboardSquare01Icon,
  Home01Icon,
  Notification01Icon,
  Settings01Icon,
  Store01Icon,
  UserCircle02Icon,
} from "hugeicons-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home01Icon },
  { href: "/dashboard/analytics", label: "Analytics", icon: Analytics01Icon },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCardIcon },
  { href: "/dashboard/store", label: "Store", icon: Store01Icon },
  { href: "/dashboard/workspace", label: "Workspace", icon: DashboardSquare01Icon },
];

const bottomItems = [
  { href: "/dashboard/notifications", label: "Notifications", icon: Notification01Icon },
  { href: "/dashboard/settings", label: "Settings", icon: Settings01Icon },
  { href: "/dashboard/account", label: "Account", icon: UserCircle02Icon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[220px] flex-shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-5">
        <span className="text-sm font-semibold tracking-tight text-foreground">Operon</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon size={18} strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-border px-3 py-4">
        {bottomItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon size={18} strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
