"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Notification01Icon, MailOpen01Icon, CheckmarkCircle01Icon } from "hugeicons-react";
import { cn } from "@/lib/utils";
import { useNotifications, type AppNotification } from "@/hooks/use-notifications";

type Filter = "all" | "unread";

function NotificationItem({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "group flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors hover:bg-accent/40",
        !notification.read && "border-primary/20 bg-accent/20",
        notification.read && "border-border",
      )}
      onClick={() => !notification.read && onRead(notification.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {!notification.read && (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
          )}
          <div className={cn("flex flex-col gap-1", notification.read && "pl-4")}>
            <span className="text-sm font-medium leading-tight">{notification.title}</span>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              {" · "}
              <span className="capitalize">{notification.type}</span>
            </span>
          </div>
        </div>
        {!notification.read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRead(notification.id);
            }}
            className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-accent hover:text-foreground"
            aria-label="Mark as read"
          >
            <CheckmarkCircle01Icon size={14} />
          </button>
        )}
      </div>
      <p className="whitespace-pre-wrap pl-4 text-sm leading-relaxed text-muted-foreground">
        {notification.body}
      </p>
    </div>
  );
}

export default function NotificationsPage() {
  useEffect(() => { document.title = "Notifications | Operon"; }, []);
  const [filter, setFilter] = useState<Filter>("all");
  const { notifications, unreadCount, loading, markOneRead, markAllRead, triggerDigest } =
    useNotifications();
  const [triggering, setTriggering] = useState(false);

  const filtered =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  async function handleTrigger() {
    setTriggering(true);
    try {
      await triggerDigest();
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} unread
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <MailOpen01Icon size={12} />
                Mark all read
              </button>
            )}
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Notification01Icon size={12} />
              {triggering ? "Generating…" : "Trigger digest"}
            </button>
          </div>
        </div>

        <div className="mb-4 flex gap-1 rounded-lg border p-1">
          {(["all", "unread"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                filter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {f}
              {f === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Notification01Icon size={32} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {triggering ? "Generating digest…" : "Generate your first digest"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((n) => (
              <NotificationItem key={n.id} notification={n} onRead={markOneRead} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
