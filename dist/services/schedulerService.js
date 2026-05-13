"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduler = startScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const digestService_1 = require("./digestService");
const fatigueService_1 = require("./fatigueService");
const redditAcquisitionService_1 = require("./redditAcquisitionService");
const recommendationOutcomeService_1 = require("./recommendationOutcomeService");
const agencyService_1 = require("./agencyService");
const communityBenchmarkService_1 = require("./communityBenchmarkService");
let started = false;
function startScheduler() {
    if (started)
        return;
    started = true;
    node_cron_1.default.schedule("0 22 * * 0", async () => {
        console.log("[scheduler] Running weekly digest job");
        try {
            await (0, digestService_1.generateDigestsForAllUsers)();
        }
        catch (err) {
            console.error("[scheduler] Weekly digest job failed:", err);
        }
    }, { timezone: "UTC" });
    node_cron_1.default.schedule("15 7 * * *", async () => {
        console.log("[scheduler] Running creative fatigue job");
        try {
            await (0, fatigueService_1.runFatigueChecksForDueAccounts)();
        }
        catch (err) {
            console.error("[scheduler] Creative fatigue job failed:", err);
        }
    });
    node_cron_1.default.schedule("45 6 * * *", async () => {
        console.log("[scheduler] Running Reddit acquisition scan");
        try {
            await (0, redditAcquisitionService_1.runRedditAcquisitionScan)();
        }
        catch (err) {
            console.error("[scheduler] Reddit acquisition scan failed:", err);
        }
    });
    node_cron_1.default.schedule("30 5 * * *", async () => {
        console.log("[scheduler] Recomputing recommendation accuracy");
        try {
            await (0, recommendationOutcomeService_1.recomputeDueRecommendationOutcomes)();
        }
        catch (err) {
            console.error("[scheduler] Recommendation accuracy job failed:", err);
        }
    });
    node_cron_1.default.schedule("50 4 * * *", async () => {
        console.log("[scheduler] Recomputing community benchmarks");
        try {
            await (0, communityBenchmarkService_1.recomputeCommunityBenchmarks)();
        }
        catch (err) {
            console.error("[scheduler] Community benchmark job failed:", err);
        }
    });
    node_cron_1.default.schedule("10 6 * * 1", async () => {
        console.log("[scheduler] Generating agency weekly reports");
        try {
            await (0, agencyService_1.generateWeeklyAgencyReports)();
        }
        catch (err) {
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
