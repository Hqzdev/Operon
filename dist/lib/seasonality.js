"use strict";
/** Season-aware multipliers for e-commerce ad performance thresholds. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeekOfYear = getWeekOfYear;
exports.getSeasonContext = getSeasonContext;
function getWeekOfYear(date) {
    const jan4 = new Date(date.getFullYear(), 0, 4);
    const startOfWeek1 = new Date(jan4);
    startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
    const diff = date.getTime() - startOfWeek1.getTime();
    if (diff < 0) {
        return getWeekOfYear(new Date(date.getFullYear() - 1, 11, 28));
    }
    return Math.floor(diff / (7 * 86_400_000)) + 1;
}
function getSeasonContext(date = new Date()) {
    const month = date.getMonth() + 1;
    const week = getWeekOfYear(date);
    if (week === 47) {
        return {
            month, weekOfYear: week,
            label: "Black Friday / Cyber Monday",
            ctrMultiplier: 1.50, atcMultiplier: 1.45, convMultiplier: 1.40, cpmMultiplier: 1.70,
            confidenceBonus: 12, scaleEagerness: 0.8, killReticence: 0.7,
            isMaterial: true,
            note: "Black Friday / Cyber Monday — market CTR and conversion are at their annual peak. False KILLs are most common this week; thresholds have been adjusted accordingly.",
        };
    }
    if (week >= 51) {
        return {
            month, weekOfYear: week,
            label: "Christmas Peak",
            ctrMultiplier: 1.35, atcMultiplier: 1.40, convMultiplier: 1.35, cpmMultiplier: 1.50,
            confidenceBonus: 10, scaleEagerness: 0.6, killReticence: 0.6,
            isMaterial: true,
            note: "Christmas peak — buyer intent is at its highest. Even marginal setups routinely outperform their annual baseline this week.",
        };
    }
    if (week >= 43 && week <= 50) {
        return {
            month, weekOfYear: week,
            label: "Q4 Pre-peak",
            ctrMultiplier: 1.25, atcMultiplier: 1.20, convMultiplier: 1.18, cpmMultiplier: 1.30,
            confidenceBonus: 8, scaleEagerness: 0.5, killReticence: 0.5,
            isMaterial: true,
            note: "Q4 demand is rising — conversion intent is above the annual baseline. Thresholds adjusted to reduce false KILLs.",
        };
    }
    if (week >= 40 && week <= 42) {
        return {
            month, weekOfYear: week,
            label: "Q4 Ramp",
            ctrMultiplier: 1.10, atcMultiplier: 1.08, convMultiplier: 1.08, cpmMultiplier: 1.10,
            confidenceBonus: 4, scaleEagerness: 0.3, killReticence: 0.3,
            isMaterial: true,
            note: "Early Q4 — demand is building. Verdict leans toward testing before killing.",
        };
    }
    if (week <= 3) {
        return {
            month, weekOfYear: week,
            label: "Post-holiday Slump",
            ctrMultiplier: 0.75, atcMultiplier: 0.70, convMultiplier: 0.72, cpmMultiplier: 0.85,
            confidenceBonus: -15, scaleEagerness: -0.8, killReticence: -0.1,
            isMaterial: true,
            note: "Post-holiday slump (Jan 1–20) — market-wide CTR and conversion drop 25–30% below annual mean. Your CTR may look below the static threshold while actually matching the niche median for this week. Scaling into this window carries high risk.",
        };
    }
    if (week <= 5) {
        return {
            month, weekOfYear: week,
            label: "January Recovery",
            ctrMultiplier: 0.88, atcMultiplier: 0.85, convMultiplier: 0.85, cpmMultiplier: 0.90,
            confidenceBonus: -8, scaleEagerness: -0.4, killReticence: 0.0,
            isMaterial: true,
            note: "January recovery — market has not fully rebounded from post-holiday slump. Treat positive signals with caution before scaling.",
        };
    }
    if (week >= 6 && week <= 7) {
        return {
            month, weekOfYear: week,
            label: "Valentine's Season",
            ctrMultiplier: 1.15, atcMultiplier: 1.20, convMultiplier: 1.15, cpmMultiplier: 1.20,
            confidenceBonus: 5, scaleEagerness: 0.2, killReticence: 0.2,
            isMaterial: false, note: null,
        };
    }
    if (week >= 33 && week <= 38) {
        return {
            month, weekOfYear: week,
            label: "Back to School",
            ctrMultiplier: 1.08, atcMultiplier: 1.10, convMultiplier: 1.08, cpmMultiplier: 1.05,
            confidenceBonus: 3, scaleEagerness: 0.1, killReticence: 0.1,
            isMaterial: false, note: null,
        };
    }
    if (week >= 22 && week <= 35) {
        return {
            month, weekOfYear: week,
            label: "Summer",
            ctrMultiplier: 0.92, atcMultiplier: 0.90, convMultiplier: 0.90, cpmMultiplier: 0.88,
            confidenceBonus: -5, scaleEagerness: -0.2, killReticence: 0.0,
            isMaterial: false, note: null,
        };
    }
    return {
        month, weekOfYear: week,
        label: "Normal",
        ctrMultiplier: 1.0, atcMultiplier: 1.0, convMultiplier: 1.0, cpmMultiplier: 1.0,
        confidenceBonus: 0, scaleEagerness: 0, killReticence: 0,
        isMaterial: false, note: null,
    };
}
