"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Filter, LoaderCircle, RefreshCw, Search, Trash2 } from "lucide-react";
import {
  DEFAULT_DROPSHIPPING_SUBREDDITS,
  emptyRedditLeadsStorage,
  mergePosts,
  readRedditLeadsStorage,
  sortRedditPosts,
  writeRedditLeadsStorage,
  type RedditSortMode,
  type ReplyStyle,
} from "@/lib/reddit";
import { extractShopKeywords, type RedditLeadPost, type RedditLeadStatus, type RedditPostInput } from "@/lib/relevance";
import { cn } from "@/lib/utils";
import { GenerateDMModal } from "@/app/components/GenerateDMModal";
import { RedditLeadCard, RedditLeadStatusBadge } from "@/app/components/RedditLeadCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export function RedditLeadsWidget({
  defaultShopName,
  defaultProductDescription,
}: {
  defaultShopName?: string | null;
  defaultProductDescription?: string | null;
}) {
  const [storage, setStorage] = useState(emptyRedditLeadsStorage);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<RedditSortMode>("Quality");
  const [replyStyle, setReplyStyle] = useState<ReplyStyle>("Casual");
  const [minScore, setMinScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dmOpen, setDmOpen] = useState(false);

  useEffect(() => {
    const saved = readRedditLeadsStorage();
    const nextStorage = {
      ...saved,
      shopName: saved.shopName || defaultShopName || "",
      productDescription: saved.productDescription || defaultProductDescription || "",
    };
    setStorage(nextStorage);
    setSelectedId(nextStorage.posts[0]?.id ?? null);
  }, [defaultProductDescription, defaultShopName]);

  function updateStorage(next: typeof storage) {
    setStorage(next);
    writeRedditLeadsStorage(next);
  }

  const visiblePosts = useMemo(() => {
    return sortRedditPosts(storage.posts, sortMode).filter((post) => post.relevanceScore >= minScore);
  }, [minScore, sortMode, storage.posts]);

  const newPosts = visiblePosts.filter((post) => post.status !== "Contacted");
  const contactedPosts = visiblePosts.filter((post) => post.status === "Contacted");
  const selectedPost = visiblePosts.find((post) => post.id === selectedId) ?? visiblePosts[0] ?? null;

  async function findLeads() {
    const keywords = extractShopKeywords(storage.productDescription);
    if (keywords.length === 0) {
      setError("Add a product or store description first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        subreddits: DEFAULT_DROPSHIPPING_SUBREDDITS.join(","),
        limit: "120",
      });
      const fetchResponse = await fetch(`/api/reddit/fetch-posts?${params.toString()}`, { cache: "no-store" });
      const fetchData = (await fetchResponse.json()) as { posts?: RedditPostInput[]; message?: string; fetchedAt?: string };
      if (!fetchResponse.ok || !fetchData.posts) throw new Error(fetchData.message ?? "Unable to fetch Reddit posts");

      const relevanceResponse = await fetch("/api/reddit/calculate-relevance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: fetchData.posts, shopKeywords: keywords }),
      });
      const relevanceData = (await relevanceResponse.json()) as { posts?: RedditLeadPost[]; message?: string };
      if (!relevanceResponse.ok || !relevanceData.posts) throw new Error(relevanceData.message ?? "Unable to score posts");

      const scored = relevanceData.posts.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 200);
      const nextPosts = mergePosts(storage.posts, scored);
      const nextStorage = {
        ...storage,
        posts: nextPosts,
        lastFetchedAt: fetchData.fetchedAt ?? new Date().toISOString(),
        shopKeywords: keywords,
      };
      updateStorage(nextStorage);
      setSelectedId(scored[0]?.id ?? nextPosts[0]?.id ?? null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to find Reddit leads");
    } finally {
      setLoading(false);
    }
  }

  function updatePost(postId: string, patch: Partial<RedditLeadPost>) {
    const next = {
      ...storage,
      posts: storage.posts.map((post) => (post.id === postId ? { ...post, ...patch } : post)),
    };
    updateStorage(next);
  }

  function deletePost(postId: string) {
    const nextPosts = storage.posts.filter((post) => post.id !== postId);
    updateStorage({ ...storage, posts: nextPosts });
    if (selectedId === postId) setSelectedId(nextPosts[0]?.id ?? null);
  }

  function openPost(post: RedditLeadPost) {
    window.open(post.postUrl, "_blank", "noopener,noreferrer");
  }

  function renderList(posts: RedditLeadPost[]) {
    if (posts.length === 0) {
      return (
        <div className="flex min-h-[260px] items-center justify-center px-4 text-center text-[13px] text-muted-foreground">
          No posts in this view yet.
        </div>
      );
    }

    return posts.map((post) => (
      <RedditLeadCard
        key={post.id}
        post={post}
        selected={selectedPost?.id === post.id}
        onSelect={() => setSelectedId(post.id)}
        onStatusChange={(status) => updatePost(post.id, { status })}
      />
    ));
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <h2 className="text-[14px] font-semibold text-foreground">Reddit lead finder</h2>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Find dropshipping conversations and rank them by fit.
          </p>
        </div>
        <Button type="button" onClick={() => void findLeads()} disabled={loading} className="h-9 rounded-md text-[13px]">
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Find Leads on Reddit
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
        <Input
          value={storage.shopName}
          onChange={(event) => updateStorage({ ...storage, shopName: event.target.value })}
          placeholder="Store name"
          className="h-9 rounded-md text-[13px]"
        />
        <Textarea
          value={storage.productDescription}
          onChange={(event) => updateStorage({ ...storage, productDescription: event.target.value })}
          placeholder="Describe your store/product: niche, customers, problems you solve, keywords..."
          className="min-h-9 resize-y rounded-md text-[13px]"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select value={sortMode} onValueChange={(value) => setSortMode(value as RedditSortMode)}>
          <SelectTrigger size="sm" className="min-w-[132px] rounded-md text-[12px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Quality">Quality</SelectItem>
            <SelectItem value="Recent">Recent</SelectItem>
            <SelectItem value="Most Engaged">Most Engaged</SelectItem>
          </SelectContent>
        </Select>

        <Select value={replyStyle} onValueChange={(value) => setReplyStyle(value as ReplyStyle)}>
          <SelectTrigger size="sm" className="min-w-[150px] rounded-md text-[12px]">
            <SelectValue placeholder="Reply style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Casual">Casual</SelectItem>
            <SelectItem value="Professional">Professional</SelectItem>
            <SelectItem value="Humorous">Humorous</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-8 rounded-md text-[12px]", minScore > 0 && "border-foreground/40")}
          onClick={() => setMinScore((score) => (score === 0 ? 50 : score === 50 ? 75 : 0))}
        >
          <Filter className="size-3.5" />
          Options {minScore > 0 ? `${minScore}%+` : ""}
        </Button>

        {storage.lastFetchedAt ? (
          <span className="text-[11px] text-muted-foreground">
            Last fetched {new Date(storage.lastFetchedAt).toLocaleString()}
          </span>
        ) : null}
        {error ? <span className="text-[12px] text-red-600">{error}</span> : null}
      </div>

      <div className="mt-4 grid min-h-[520px] overflow-hidden rounded-lg border border-border lg:grid-cols-[420px_minmax(0,1fr)]">
        <Tabs defaultValue="new" className="min-h-0 border-b border-border lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <TabsList className="h-8 rounded-md">
              <TabsTrigger value="new" className="rounded-sm px-3 text-[12px]">
                New {newPosts.length}
              </TabsTrigger>
              <TabsTrigger value="contacted" className="rounded-sm px-3 text-[12px]">
                Contacted {contactedPosts.length}
              </TabsTrigger>
            </TabsList>
            <span className="text-[11px] text-muted-foreground">{storage.posts.length} saved</span>
          </div>
          <TabsContent value="new" className="m-0 max-h-[590px] overflow-y-auto">
            {renderList(newPosts)}
          </TabsContent>
          <TabsContent value="contacted" className="m-0 max-h-[590px] overflow-y-auto">
            {renderList(contactedPosts)}
          </TabsContent>
        </Tabs>

        <div className="min-w-0 bg-background">
          {selectedPost ? (
            <div className="flex h-full min-h-[520px] flex-col">
              <div className="border-b border-border px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-[18px] font-semibold tabular-nums">
                    {selectedPost.relevanceScore}%
                  </div>
                  <RedditLeadStatusBadge status={selectedPost.status} />
                  <span className="text-[12px] text-muted-foreground">
                    {selectedPost.subreddit} · {selectedPost.comments} comments · {selectedPost.upvotes} upvotes
                  </span>
                </div>
                <h3 className="mt-3 text-[18px] font-semibold leading-6 tracking-normal">{selectedPost.title}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedPost.flairs.map((flair) => (
                    <span key={flair} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {flair}
                    </span>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <p className="whitespace-pre-wrap text-[13px] leading-6 text-foreground/85">
                  {selectedPost.body || "This Reddit post has no body text. Open the original post for the full thread."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
                <Button type="button" size="sm" className="h-8 rounded-md text-[12px]" onClick={() => setDmOpen(true)}>
                  Generate DM
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-md text-[12px]"
                  onClick={() => updatePost(selectedPost.id, { status: "Contacted" })}
                >
                  Contacted
                </Button>
                <Select
                  value={selectedPost.status}
                  onValueChange={(value) => updatePost(selectedPost.id, { status: value as RedditLeadStatus })}
                >
                  <SelectTrigger size="sm" className="h-8 min-w-[154px] rounded-md text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Queued">Queued</SelectItem>
                    <SelectItem value="Contacted">Contacted</SelectItem>
                    <SelectItem value="Interested">Interested</SelectItem>
                    <SelectItem value="Frustrated with current solution">Frustrated</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-md text-[12px]"
                  onClick={() => openPost(selectedPost)}
                >
                  <ExternalLink className="size-3.5" />
                  Open
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="ml-auto h-8 rounded-md text-[12px] text-red-600 hover:text-red-700"
                  onClick={() => deletePost(selectedPost.id)}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[520px] items-center justify-center px-4 text-center text-[13px] text-muted-foreground">
              Add a product description, then find Reddit leads.
            </div>
          )}
        </div>
      </div>

      <GenerateDMModal
        open={dmOpen}
        post={selectedPost}
        shopName={storage.shopName}
        productDescription={storage.productDescription}
        style={replyStyle}
        onOpenChange={setDmOpen}
        onGenerated={(message) => {
          if (!selectedPost) return;
          updatePost(selectedPost.id, {
            status: "Contacted",
            dmGenerated: true,
            dmTemplate: message,
          });
        }}
      />
    </section>
  );
}
