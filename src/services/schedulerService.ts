import cron from "node-cron";
import { generateDigestsForAllUsers } from "./digestService";
import { runFatigueChecksForDueAccounts } from "./fatigueService";
import { runRedditAcquisitionScan } from "./redditAcquisitionService";
import { recomputeDueRecommendationOutcomes } from "./recommendationOutcomeService";
import { generateWeeklyAgencyReports } from "./agencyService";
import { recomputeCommunityBenchmarks } from "./communityBenchmarkService";

let started = false;

export function startScheduler(): void {
  if (started) return;
  started = true;

  cron.schedule("0 22 * * 0", async () => {
    console.log("[scheduler] Running weekly digest job");
    try {
      await generateDigestsForAllUsers();
    } catch (err) {
      console.error("[scheduler] Weekly digest job failed:", err);
    }
  }, { timezone: "UTC" });

  cron.schedule("15 7 * * *", async () => {
    console.log("[scheduler] Running creative fatigue job");
    try {
      await runFatigueChecksForDueAccounts();
    } catch (err) {
      console.error("[scheduler] Creative fatigue job failed:", err);
    }
  });

  cron.schedule("45 6 * * *", async () => {
    console.log("[scheduler] Running Reddit acquisition scan");
    try {
      await runRedditAcquisitionScan();
    } catch (err) {
      console.error("[scheduler] Reddit acquisition scan failed:", err);
    }
  });

  cron.schedule("30 5 * * *", async () => {
    console.log("[scheduler] Recomputing recommendation accuracy");
    try {
      await recomputeDueRecommendationOutcomes();
    } catch (err) {
      console.error("[scheduler] Recommendation accuracy job failed:", err);
    }
  });

  cron.schedule("50 4 * * *", async () => {
    console.log("[scheduler] Recomputing community benchmarks");
    try {
      await recomputeCommunityBenchmarks();
    } catch (err) {
      console.error("[scheduler] Community benchmark job failed:", err);
    }
  });

  cron.schedule("10 6 * * 1", async () => {
    console.log("[scheduler] Generating agency weekly reports");
    try {
      await generateWeeklyAgencyReports();
    } catch (err) {
      console.error("[scheduler] Agency weekly report job failed:", err);
    }
  });

  console.log("[scheduler] Agency weekly reports scheduled for Monday 06:10");
  console.log("[scheduler] Recommendation accuracy scheduled for 05:30 daily");
  console.log("[scheduler] Community benchmarks scheduled for 04:50 daily");
  console.log("[scheduler] Weekly digest scheduled for Sunday 22:00 UTC");
  console.log("[scheduler] Creative fatigue check scheduled for 07:15 daily");
  console.log("[scheduler] Reddit acquisition scan scheduled for 06:45 daily");
}
