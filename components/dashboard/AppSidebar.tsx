"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTheme } from "next-themes";
import {
  Analytics01Icon,
  ChartBreakoutSquareIcon,
  ConnectIcon,
  Home01Icon,
  Money01Icon,
  Notification01Icon,
  Rocket01Icon,
  Settings01Icon,
  UserCircle02Icon,
} from "hugeicons-react";
import { formatDistanceToNow } from "date-fns";
import {
  CalendarDays,
  Check,
  ChevronsUpDown,
  CircleHelp,
  Lightbulb,
  LogOut,
  PanelLeftClose,
  Plus,
  Settings,
  Sparkles,
  Store,
  Sun,
  Moon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { useNotifications } from "@/hooks/use-notifications";

const mainNav = [
  {
    title: "Home",
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
    title: "Settings",
    href: "/dashboard?tab=settings",
    icon: Settings01Icon,
    tab: "settings",
  },
] as const;

type StoreSummary = {
  id: string;
  name: string;
  url: string;
  platform?: string | null;
};

type SidebarProfile = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  plan?: string | null;
  storeName?: string | null;
  storeUrl?: string | null;
  activeStoreId?: string | null;
  activeStore?: StoreSummary | null;
  stores?: StoreSummary[];
};

function storeDisplayName(store?: Pick<StoreSummary, "name" | "url"> | null) {
  const raw = store?.name || store?.url || "";
  if (!raw.trim()) return "Add store";

  try {
    const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
    const hostname = new URL(withProtocol).hostname.replace(/^www\./, "");
    const [name] = hostname.split(".");
    return name || hostname;
  } catch {
    return raw
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\.[a-z]{2,}(?:\.[a-z]{2,})?$/i, "")
      .replace(/\/$/, "");
  }
}

function SidebarBottomBlock() {
  const [profile, setProfile] = useState<SidebarProfile | null>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    const raw = localStorage.getItem("operon_user");
    if (raw) {
      try {
        setProfile(JSON.parse(raw) as SidebarProfile);
      } catch {
        // ignore stale local profile
      }
    }

    const token = localStorage.getItem("operon_token");
    if (!token) return;

    fetch(`${apiBaseUrl}/users/me`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.ok ? response.json() : null)
      .then((nextProfile) => {
        if (!nextProfile) return;
        setProfile(nextProfile);
        localStorage.setItem("operon_user", JSON.stringify(nextProfile));
      })
      .catch(() => {
        // footer can render from cached profile
      });
  }, [apiBaseUrl]);

  const displayName = profile?.name || profile?.email?.split("@")[0] || "User";
  const plan = profile?.plan === "STARTER" ? "FREE" : profile?.plan ?? "FREE";
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";
  const isDarkTheme = resolvedTheme === "dark";

  function signOut() {
    localStorage.removeItem("operon_token");
    localStorage.removeItem("operon_user");
    window.location.href = "/login";
  }

  return (
    <div className="space-y-4 group-data-[collapsible=icon]:hidden">
      <div className="space-y-1">
        <SidebarMenuItem>
          <Popover>
            <PopoverTrigger asChild>
              <SidebarMenuButton
                size="default"
                tooltip="What's New"
                className="h-10 rounded-md px-3 text-[13px] font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&>svg]:size-4"
              >
                <Sparkles size={16} />
                <span>What's New</span>
                <PanelLeftClose size={15} className="ml-auto text-muted-foreground" />
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="end"
              sideOffset={14}
              className="w-[340px] overflow-hidden rounded-2xl border-border p-0 shadow-xl"
            >
              <div className="border-b px-5 py-4">
                <div className="text-[17px] font-semibold tracking-normal">What's New</div>
              </div>
              <div className="divide-y">
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                        NEW
                      </span>
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold leading-snug">
                          Reddit acquisition engine
                        </div>
                        <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
                          Finds Reddit posts about CPM spikes, ROAS drops, CPA issues, and creative fatigue.
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">Today</span>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                        IMPROVED
                      </span>
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold leading-snug">
                          Budget prediction simulator
                        </div>
                        <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
                          Preview CPA, revenue, ROAS, risk level, and confidence before budget changes.
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">Today</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            size="default"
            tooltip="Talk to a founder"
            className="h-10 rounded-md px-3 text-[13px] font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&>svg]:size-4"
          >
            <Link href="mailto:founder@operon.app">
              <CalendarDays size={16} />
              <span>Talk to a founder</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-sidebar-accent">
            <Avatar className="size-10 bg-emerald-800">
              <AvatarImage src={profile?.avatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-emerald-800 text-lg font-medium text-white">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-sidebar-foreground">{displayName}</span>
              <span className="mt-1 inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {plan}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="end"
          sideOffset={14}
          className="w-[330px] rounded-3xl border-border p-5 shadow-xl"
        >
          <div className="flex items-center gap-4">
            <Avatar className="size-14 bg-emerald-800">
              <AvatarImage src={profile?.avatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-emerald-800 text-2xl font-medium text-white">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-[18px] font-medium text-foreground">{displayName}</div>
              <div className="truncate text-[14px] text-muted-foreground">{profile?.email}</div>
            </div>
          </div>

          <div className="mt-7 space-y-1">
            <Link href="/dashboard?tab=settings" className="flex items-center gap-3 rounded-xl px-1 py-2.5 text-[15px] hover:bg-muted">
              <Settings className="size-5" />
              Settings
            </Link>
            <Link href="mailto:founder@operon.app?subject=Feature request" className="flex items-center gap-3 rounded-xl px-1 py-2.5 text-[15px] hover:bg-muted">
              <Lightbulb className="size-5" />
              Request a feature
            </Link>
            <Link href="/docs" className="flex items-center gap-3 rounded-xl px-1 py-2.5 text-[15px] hover:bg-muted">
              <CircleHelp className="size-5" />
              Help
            </Link>
          </div>

          <div className="mt-7 flex items-center justify-between">
            <span className="text-[15px] text-foreground">Theme</span>
            <div className="flex rounded-xl bg-muted p-1">
              <button
                onClick={() => setTheme("light")}
                className={cn("flex size-9 items-center justify-center rounded-lg", !isDarkTheme && "bg-background shadow-sm")}
                aria-label="Use light theme"
              >
                <Sun className="size-4" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={cn("flex size-9 items-center justify-center rounded-lg", isDarkTheme && "bg-background shadow-sm")}
                aria-label="Use dark theme"
              >
                <Moon className="size-4" />
              </button>
            </div>
          </div>

          <button
            onClick={signOut}
            className="mt-7 flex items-center gap-3 rounded-xl px-1 py-2.5 text-[15px] text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-5" />
            Sign out
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function NotificationBell() {
  const { notifications, unreadCount, markOneRead, markAllRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none"
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
              className="rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
            className="rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            View all notifications →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StoreSwitcher() {
  const [profile, setProfile] = useState<SidebarProfile | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("operon_token") : null;
  const apiBaseUrl = getApiBaseUrl();

  const stores = useMemo(() => {
    const list = profile?.stores ?? [];
    if (list.length > 0) return list;
    if (profile?.storeName || profile?.storeUrl) {
      return [{
        id: profile.activeStoreId ?? "legacy-store",
        name: profile.storeName || profile.storeUrl || "Store",
        url: profile.storeUrl || "",
      }];
    }
    return [];
  }, [profile]);

  const activeStore = profile?.activeStore
    ?? stores.find((store) => store.id === profile?.activeStoreId)
    ?? stores[0];
  const displayName = storeDisplayName(activeStore);

  async function loadProfile() {
    if (!token) return;
    const response = await fetch(`${apiBaseUrl}/users/me`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const nextProfile = await response.json();
    setProfile(nextProfile);
    localStorage.setItem("operon_user", JSON.stringify(nextProfile));
  }

  useEffect(() => {
    const raw = localStorage.getItem("operon_user");
    if (raw) {
      try {
        setProfile(JSON.parse(raw) as SidebarProfile);
      } catch {
        // ignore stale local profile
      }
    }
    void loadProfile();
  }, []);

  async function selectStore(storeId: string) {
    if (!token || storeId === profile?.activeStoreId || storeId === "legacy-store") return;
    const response = await fetch(`${apiBaseUrl}/stores/${storeId}/select`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      await loadProfile();
    }
  }

  async function addStore(event: FormEvent) {
    event.preventDefault();
    if (!token || !storeUrl.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/stores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: storeName.trim() || undefined,
          url: storeUrl.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message ?? "Unable to add store.");
        return;
      }
      setStoreName("");
      setStoreUrl("");
      setIsAddOpen(false);
      await loadProfile();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 text-left transition-colors hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#999999]">
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-5 text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              {displayName}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-64">
          <DropdownMenuLabel>Stores</DropdownMenuLabel>
          {stores.length === 0 ? (
            <DropdownMenuItem onSelect={() => setIsAddOpen(true)}>
              <Store className="size-4" />
              Add your first store
            </DropdownMenuItem>
          ) : (
            stores.map((store) => (
              <DropdownMenuItem key={store.id} onSelect={() => void selectStore(store.id)}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{storeDisplayName(store)}</div>
                </div>
                {store.id === activeStore?.id && <Check className="size-4" />}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsAddOpen(true)}>
            <Plus className="size-4" />
            Add store
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={addStore} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add store</DialogTitle>
              <DialogDescription>
                Add another storefront and make it active in this workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="sidebar-store-name">Store name</Label>
              <Input
                id="sidebar-store-name"
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                placeholder="My Shopify store"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sidebar-store-url">Store URL</Label>
              <Input
                id="sidebar-store-url"
                value={storeUrl}
                onChange={(event) => setStoreUrl(event.target.value)}
                placeholder="https://yourstore.com"
                disabled={isSaving}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={isSaving || !storeUrl.trim()}>
                {isSaving ? "Saving..." : "Save store"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
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
    if (href.startsWith("/dashboard/")) {
      return pathname === href;
    }
    return currentTab === tab;
  }

  return (
    <Sidebar collapsible="icon" className="dashboard-sidebar border-r-0 bg-sidebar text-sidebar-foreground shadow-none">
      <SidebarHeader className="px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <StoreSwitcher />
          </div>
          <ChevronsUpDown className="size-3.5 shrink-0 text-[#9CA3AF] group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup className="px-0 py-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href, item.tab)}
                    tooltip={item.title}
                    size="default"
                    className="h-9 rounded-md px-3 text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-4"
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

        <SidebarGroup className="px-0 py-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard/seo"}
                  tooltip="SEO & Marketing"
                  size="default"
                  className="h-9 rounded-md px-3 text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-4"
                >
                  <Link href="/dashboard/seo">
                    <ChartBreakoutSquareIcon size={16} />
                    <span>SEO & Marketing</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard/acquisition"}
                  tooltip="Acquisition Leads"
                  size="default"
                  className="h-9 rounded-md px-3 text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-4"
                >
                  <Link href="/dashboard/acquisition">
                    <Rocket01Icon size={16} />
                    <span>Acquisition Leads</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-0 py-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {secondaryNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href, item.tab)}
                    tooltip={item.title}
                    size="default"
                    className="h-9 rounded-md px-3 text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-4"
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

      <SidebarFooter className="border-t-0 px-3 py-2">
        <SidebarMenu>
          <SidebarBottomBlock />
          <SidebarMenuItem className="hidden group-data-[collapsible=icon]:block">
            <SidebarMenuButton
              asChild
              tooltip="Profile"
              size="default"
              className="h-9 rounded-md px-3 text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&>svg]:size-4"
            >
              <Link href="/dashboard?tab=settings">
                <UserCircle02Icon size={16} />
                <span>Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
