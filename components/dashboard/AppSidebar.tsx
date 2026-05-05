"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Analytics01Icon,
  ConnectIcon,
  Home01Icon,
  Money01Icon,
  Rocket01Icon,
  Settings01Icon,
  UserCircle02Icon,
  Wallet01Icon,
} from "hugeicons-react";

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
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-none bg-foreground text-xs font-bold text-background">
            O
          </div>
          <span className="font-semibold text-sm truncate group-data-[collapsible=icon]:hidden">
            Operon
          </span>
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
