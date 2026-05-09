"use client";

import { MessageCircle, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { engagementOf, formatRelativeTime } from "@/lib/reddit";
import { type RedditLeadPost, type RedditLeadStatus } from "@/lib/relevance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusClass: Record<RedditLeadStatus, string> = {
  Queued: "border-border bg-muted text-muted-foreground",
  Contacted: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  Interested: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  "Frustrated with current solution": "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
};

export const REDDIT_LEAD_STATUSES: RedditLeadStatus[] = [
  "Queued",
  "Contacted",
  "Interested",
  "Frustrated with current solution",
];

export function RedditLeadStatusBadge({ status }: { status: RedditLeadStatus }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium", statusClass[status])}>
      {status}
    </span>
  );
}

export function RedditLeadCard({
  post,
  selected,
  onSelect,
  onStatusChange,
}: {
  post: RedditLeadPost;
  selected: boolean;
  onSelect: () => void;
  onStatusChange: (status: RedditLeadStatus) => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full border-b border-border px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/60",
        selected && "bg-accent",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-[16px] font-semibold tabular-nums">
          {post.relevanceScore}%
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{formatRelativeTime(post.postedAt)}</span>
            <span>{post.subreddit}</span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="size-3" />
              {post.comments}
            </span>
          </div>
          <div className="mt-1 line-clamp-2 text-[13px] font-semibold leading-5 text-foreground">{post.title}</div>
          <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-muted-foreground">
            {post.body || "No body text. Open the Reddit post for full context."}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <RedditLeadStatusBadge status={post.status} />
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-md text-[10px]">
                {engagementOf(post)} engaged
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="size-7 rounded-md">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Change status</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {REDDIT_LEAD_STATUSES.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={(event) => {
                        event.stopPropagation();
                        onStatusChange(status);
                      }}
                    >
                      {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
