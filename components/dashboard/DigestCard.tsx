"use client";

import { useState } from "react";
import { Notification01Icon, FlashIcon } from "hugeicons-react";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

export function DigestCard() {
  const { notifications, triggerDigest } = useNotifications();
  const [triggering, setTriggering] = useState(false);

  const latestDigest = notifications.find((n) => n.type === "digest");

  async function handleTrigger() {
    setTriggering(true);
    try {
      await triggerDigest();
    } finally {
      setTriggering(false);
    }
  }

  if (!latestDigest) {
    return (
      <div className="flex items-center gap-3 border-b bg-card px-4 py-2.5">
        <Notification01Icon size={14} className="shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">No digest yet.</p>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className={cn(
            "ml-auto flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50",
          )}
        >
          <FlashIcon size={11} />
          {triggering ? "Generating…" : "Generate digest"}
        </button>
      </div>
    );
  }

  const firstLine = latestDigest.body.split("\n")[0];

  return (
    <div className="flex items-center gap-3 border-b bg-card px-4 py-2.5">
      <Notification01Icon size={14} className="shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium">{latestDigest.title}</span>
        <span className="mx-2 text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground line-clamp-1">{firstLine}</span>
      </div>
      <button
        onClick={handleTrigger}
        disabled={triggering}
        className="shrink-0 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        {triggering ? "Generating…" : "Refresh"}
      </button>
    </div>
  );
}
