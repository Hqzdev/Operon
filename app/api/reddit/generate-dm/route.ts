import { NextResponse } from "next/server";
import { type ReplyStyle } from "@/lib/reddit";
import { type RedditLeadPost } from "@/lib/relevance";

export const dynamic = "force-dynamic";

type GenerateDmBody = {
  post?: RedditLeadPost;
  postId?: string;
  shopName?: string;
  productDescription?: string;
  style?: ReplyStyle;
};

const generationAttempts = new Map<string, number[]>();
const MAX_ATTEMPTS_PER_HOUR = 25;

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function assertRateLimit(request: Request) {
  const key = clientKey(request);
  const cutoff = Date.now() - 60 * 60 * 1000;
  const attempts = (generationAttempts.get(key) ?? []).filter((time) => time > cutoff);
  if (attempts.length >= MAX_ATTEMPTS_PER_HOUR) {
    throw new Error("Too many DM generations. Try again in an hour.");
  }
  attempts.push(Date.now());
  generationAttempts.set(key, attempts);
}

function styleHint(style: ReplyStyle) {
  if (style === "Humorous") return "light, witty, but respectful";
  if (style === "Professional") return "concise, polished, and direct";
  return "casual, friendly, and low-pressure";
}

function fallbackDm(post: RedditLeadPost, shopName: string, productDescription: string, style: ReplyStyle) {
  const opener =
    style === "Professional"
      ? `Hi ${post.author}, I saw your post in ${post.subreddit} about "${post.title}".`
      : `Hey ${post.author}, saw your ${post.subreddit} post about "${post.title}" and thought it was interesting.`;

  const shopLine = shopName
    ? `I run ${shopName}, focused on ${productDescription || "e-commerce products"}.`
    : `I'm working on a store focused on ${productDescription || "e-commerce products"}.`;

  const close =
    style === "Humorous"
      ? "No pitch avalanche, promise. If it helps, I can share what has worked for us."
      : "If useful, I can share a quick idea based on what has worked for us.";

  return `${opener}\n\n${shopLine} Your post sounded close to a problem we pay attention to.\n\n${close}`;
}

async function generateWithClaude(post: RedditLeadPost, shopName: string, productDescription: string, style: ReplyStyle) {
  const apiKey = process.env.CLAUDE_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-latest",
      max_tokens: 260,
      messages: [
        {
          role: "user",
          content: `Write a Reddit DM. Style: ${styleHint(style)}.

Rules:
- 70 words max.
- Do not be spammy.
- Reference the post naturally.
- Do not claim the user replied.
- End with one soft question.

Shop name: ${shopName || "my store"}
Product/store description: ${productDescription}
Reddit post title: ${post.title}
Reddit post body: ${post.body.slice(0, 1200)}
Author: ${post.author}
Subreddit: ${post.subreddit}`,
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  return data.content?.find((part) => part.type === "text")?.text?.trim() ?? null;
}

export async function POST(request: Request) {
  try {
    assertRateLimit(request);
    const body = (await request.json()) as GenerateDmBody;
    if (!body.post) return NextResponse.json({ message: "Post is required" }, { status: 400 });

    const style = body.style ?? "Casual";
    const productDescription = (body.productDescription ?? "").trim();
    const shopName = (body.shopName ?? "").trim();

    if (productDescription.length < 5) {
      return NextResponse.json({ message: "Product description is required" }, { status: 400 });
    }

    const generated = await generateWithClaude(body.post, shopName, productDescription, style);
    const message = generated ?? fallbackDm(body.post, shopName, productDescription, style);

    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to generate DM" },
      { status: 429 },
    );
  }
}
