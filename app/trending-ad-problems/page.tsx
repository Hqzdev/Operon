import type { Metadata } from "next";
import Link from "next/link";
import { listTrendingAdProblems } from "@/src/services/redditAcquisitionService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trending Ad Problems Today | Operon",
  description: "An anonymized daily feed of ecommerce and paid ads problems marketers are discussing on Reddit.",
  alternates: {
    canonical: "/trending-ad-problems",
  },
  robots: {
    index: true,
    follow: true,
  },
};

function intentLabel(intent: string) {
  if (intent === "high") return "High intent";
  if (intent === "medium") return "Medium intent";
  return "Low intent";
}

function intentClass(intent: string) {
  if (intent === "high") return "border-red-200 bg-red-50 text-red-700";
  if (intent === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default async function TrendingAdProblemsPage() {
  const problems = await listTrendingAdProblems(10);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-950">
            Operon
          </Link>
          <h1 className="mt-8 max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
            Trending ad problems today
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            A public, anonymized feed of ecommerce and paid ads pain signals from Reddit.
            Updated daily from r/FacebookAds, r/PPC, r/TikTokAds, r/ecommerce, r/dropship, r/GoogleAds, and r/shopify.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-5xl px-6 py-10">
          {problems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center">
              <h2 className="text-xl font-semibold">No fresh pain posts found yet</h2>
              <p className="mt-3 text-sm text-slate-600">
                The feed updates after the next Reddit acquisition scan.
              </p>
            </div>
          ) : (
            <ol className="space-y-4">
              {problems.map((problem, index) => (
                <li key={problem.id} className="rounded-lg border border-slate-200 p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>#{index + 1}</span>
                    <span>r/{problem.subreddit}</span>
                    <span>{problem.commentCount} comments</span>
                    <span>{new Date(problem.postedAt).toLocaleDateString()}</span>
                    <span className={`rounded-full border px-2 py-0.5 font-medium ${intentClass(problem.intentLevel)}`}>
                      {intentLabel(problem.intentLevel)}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold leading-snug">{problem.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{problem.problemSummary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {problem.painSignals.map((signal) => (
                      <span key={signal} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                        {signal}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}
