CREATE TYPE "RedditIntentLevel" AS ENUM ('high', 'medium', 'low');

CREATE TABLE "RedditLead" (
    "id" TEXT NOT NULL,
    "redditPostId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "subreddit" TEXT NOT NULL,
    "postUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "problemSummary" TEXT NOT NULL,
    "intentLevel" "RedditIntentLevel" NOT NULL,
    "outreachAngle" TEXT NOT NULL,
    "painSignals" TEXT[],
    "score" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RedditLead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RedditLead_redditPostId_key" ON "RedditLead"("redditPostId");
CREATE INDEX "RedditLead_postedAt_score_idx" ON "RedditLead"("postedAt", "score");
CREATE INDEX "RedditLead_intentLevel_postedAt_idx" ON "RedditLead"("intentLevel", "postedAt");
CREATE INDEX "RedditLead_subreddit_postedAt_idx" ON "RedditLead"("subreddit", "postedAt");
