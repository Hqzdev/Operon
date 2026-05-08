"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RedditLead = {
  id: string;
  redditPostId: string;
  username: string;
  subreddit: string;
  postUrl: string;
  title: string;
  problemSummary: string;
  intentLevel: "high" | "medium" | "low";
  outreachAngle: string;
  painSignals: string[];
  score: number;
  upvotes: number;
  commentCount: number;
  postedAt: string;
  collectedAt: string;
};

function intentLabel(intent: RedditLead["intentLevel"]) {
  if (intent === "high") return "High";
  if (intent === "medium") return "Medium";
  return "Low";
}

function intentVariant(intent: RedditLead["intentLevel"]) {
  if (intent === "high") return "destructive";
  if (intent === "medium") return "secondary";
  return "outline";
}

export function RedditLeadsAdmin() {
  const [leads, setLeads] = useState<RedditLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = getApiBaseUrl();

  async function loadLeads() {
    const token = localStorage.getItem("operon_token");
    if (!token) return;
    setError(null);
    const response = await fetch(`${apiBaseUrl}/acquisition/reddit-leads`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json() as { leads?: RedditLead[]; message?: string };
    if (!response.ok) {
      setError(data.message ?? "Unable to load Reddit leads.");
      return;
    }
    setLeads(data.leads ?? []);
  }

  async function runScan() {
    const token = localStorage.getItem("operon_token");
    if (!token) return;
    setRunning(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/acquisition/reddit-leads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json() as { result?: { matchedPosts: number; saved: number }; message?: string };
      if (!response.ok) {
        setError(data.message ?? "Unable to run Reddit scan.");
        return;
      }
      setMessage(`Scan complete: ${data.result?.matchedPosts ?? 0} matched posts, ${data.result?.saved ?? 0} saved.`);
      await loadLeads();
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    void loadLeads().finally(() => setLoading(false));
  }, []);

  return (
    <main className="h-full overflow-y-auto bg-background px-6 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Reddit acquisition leads</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              High-intent posts from ad operators asking for help with CPM, CPA, ROAS, conversion drops, and creative fatigue.
            </p>
          </div>
          <Button onClick={runScan} disabled={running} className="rounded-full">
            {running ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Run scan now
          </Button>
        </div>

        {message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <div className="grid min-w-[980px] grid-cols-[1.05fr_1.15fr_0.8fr_1.25fr] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <div>Lead</div>
            <div>Problem</div>
            <div>Intent</div>
            <div>Outreach angle</div>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              No leads collected yet. Run the scan to populate this list.
            </div>
          ) : (
            <div className="min-w-[980px] divide-y divide-border">
              {leads.map((lead) => (
                <div key={lead.id} className="grid grid-cols-[1.05fr_1.15fr_0.8fr_1.25fr] gap-4 px-4 py-4 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium tabular-nums">u/{lead.username}</div>
                    <div className="mt-1 text-xs text-muted-foreground">r/{lead.subreddit}</div>
                    <Link
                      href={lead.postUrl}
                      target="_blank"
                      className="mt-2 block truncate text-xs text-blue-600 hover:underline"
                    >
                      Open post
                    </Link>
                  </div>
                  <div className="min-w-0">
                    <div className="line-clamp-2 font-medium">{lead.title}</div>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                      {lead.problemSummary}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {lead.painSignals.map((signal) => (
                        <span key={signal} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {signal}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Badge variant={intentVariant(lead.intentLevel)}>{intentLabel(lead.intentLevel)}</Badge>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Score {lead.score} · {lead.commentCount} comments
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(lead.postedAt).toLocaleString()}
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{lead.outreachAngle}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
