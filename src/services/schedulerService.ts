import cron from "node-cron";
import { generateDigestsForAllUsers } from "./digestService";
import { runFatigueChecksForDueAccounts } from "./fatigueService";
import { runRedditAcquisitionScan } from "./redditAcquisitionService";

let started = false;

export function startScheduler(): void {
  if (started) return;
  started = true;

  cron.schedule("0 8 * * *", async () => {
    console.log("[scheduler] Running morning digest job");
    try {
      await generateDigestsForAllUsers();
    } catch (err) {
      console.error("[scheduler] Morning digest job failed:", err);
    }
  });

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

  console.log("[scheduler] Morning digest scheduled for 08:00 daily");
  console.log("[scheduler] Creative fatigue check scheduled for 07:15 daily");
  console.log("[scheduler] Reddit acquisition scan scheduled for 06:45 daily");
}
