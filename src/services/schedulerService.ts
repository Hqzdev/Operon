import cron from "node-cron";
import { generateDigestsForAllUsers } from "./digestService";

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

  console.log("[scheduler] Morning digest scheduled for 08:00 daily");
}
