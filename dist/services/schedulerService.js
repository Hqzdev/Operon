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
let started = false;
function startScheduler() {
    if (started)
        return;
    started = true;
    node_cron_1.default.schedule("0 8 * * *", async () => {
        console.log("[scheduler] Running morning digest job");
        try {
            await (0, digestService_1.generateDigestsForAllUsers)();
        }
        catch (err) {
            console.error("[scheduler] Morning digest job failed:", err);
        }
    });
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
    console.log("[scheduler] Morning digest scheduled for 08:00 daily");
    console.log("[scheduler] Creative fatigue check scheduled for 07:15 daily");
    console.log("[scheduler] Reddit acquisition scan scheduled for 06:45 daily");
}
