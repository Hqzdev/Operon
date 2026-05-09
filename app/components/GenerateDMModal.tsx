"use client";

import { useEffect, useState } from "react";
import { Check, Copy, LoaderCircle } from "lucide-react";
import { type ReplyStyle } from "@/lib/reddit";
import { type RedditLeadPost } from "@/lib/relevance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function GenerateDMModal({
  open,
  post,
  shopName,
  productDescription,
  style,
  onOpenChange,
  onGenerated,
}: {
  open: boolean;
  post: RedditLeadPost | null;
  shopName: string;
  productDescription: string;
  style: ReplyStyle;
  onOpenChange: (open: boolean) => void;
  onGenerated: (message: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !post) return;
    setCopied(false);
    setError(null);
    setMessage(post.dmTemplate ?? "");
  }, [open, post]);

  async function generate() {
    if (!post) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/reddit/generate-dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, post, shopName, productDescription, style }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok || !data.message) throw new Error(data.message ?? "Unable to generate DM");
      setMessage(data.message);
      onGenerated(data.message);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to generate DM");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Generate DM</DialogTitle>
          <DialogDescription>
            Edit the message before sending it manually on Reddit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12px] leading-5 text-muted-foreground">
            <span className="font-medium text-foreground">{post?.author}</span> · {post?.subreddit}
            <div className="mt-1 line-clamp-2 text-foreground">{post?.title}</div>
          </div>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Generated DM will appear here."
            className="min-h-[180px] resize-y rounded-lg text-[13px] leading-6"
          />
          {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => void generate()} disabled={loading || !post}>
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Generate
          </Button>
          <Button type="button" onClick={() => void copy()} disabled={!message}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
