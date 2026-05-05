"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Analytics01Icon,
  ConnectIcon,
  Home01Icon,
  Money01Icon,
  Notification01Icon,
  Rocket01Icon,
  Settings01Icon,
  UserCircle02Icon,
  Wallet01Icon,
} from "hugeicons-react";
import { formatDistanceToNow } from "date-fns";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";

const mainNav = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home01Icon,
    tab: null,
  },
  {
    title: "Analytics",
    href: "/dashboard?tab=analysis",
    icon: Analytics01Icon,
    tab: "analysis",
  },
  {
    title: "Integrations",
    href: "/dashboard?tab=integrations",
    icon: ConnectIcon,
    tab: "integrations",
  },
  {
    title: "Budget Allocation",
    href: "/dashboard?tab=budget",
    icon: Money01Icon,
    tab: "budget",
  },
  {
    title: "Scenario Simulator",
    href: "/dashboard?tab=scenarios",
    icon: Rocket01Icon,
    tab: "scenarios",
  },
] as const;

const secondaryNav = [
  {
    title: "Payments",
    href: "/dashboard?tab=payments",
    icon: Wallet01Icon,
    tab: "payments",
  },
  {
    title: "Settings",
    href: "/dashboard?tab=settings",
    icon: Settings01Icon,
    tab: "settings",
  },
] as const;

function NotificationBell() {
  const { notifications, unreadCount, markOneRead, markAllRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none"
          aria-label="Notifications"
        >
          <Notification01Icon size={18} strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        sideOffset={8}
        className="w-80 p-0"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          ) : (
            notifications.slice(0, 10).map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && markOneRead(n.id)}
                className={cn(
                  "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-accent",
                  !n.read && "bg-accent/40",
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.read && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium leading-tight",
                      !n.read && "pl-0",
                      n.read && "pl-3.5",
                    )}
                  >
                    {n.title}
                  </span>
                </div>
                <p className="line-clamp-2 pl-3.5 text-xs text-muted-foreground">
                  {n.body.split("\n")[0]}
                </p>
                <span className="pl-3.5 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="border-t px-4 py-2">
          <Link
            href="/dashboard/notifications"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            View all notifications →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  function isActive(href: string, tab: string | null) {
    if (tab === null) {
      return pathname === "/dashboard" && !currentTab;
    }
    return currentTab === tab;
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <div className="flex items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-none bg-foreground text-xs font-bold text-background">
              O
            </div>
            <span className="font-semibold text-sm truncate group-data-[collapsible=icon]:hidden">
              Operon
            </span>
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <NotificationBell />
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href, item.tab)}
                    tooltip={item.title}
                    size="default"
                    className="rounded-none justify-start"
                  >
                    <Link href={item.href}>
                      <item.icon size={16} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href, item.tab)}
                    tooltip={item.title}
                    size="default"
                    className="rounded-none justify-start"
                  >
                    <Link href={item.href}>
                      <item.icon size={16} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Profile"
              size="default"
              className="rounded-none justify-start"
            >
              <Link href="/dashboard?tab=settings">
                <UserCircle02Icon size={16} />
                <span>Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
