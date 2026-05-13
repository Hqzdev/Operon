"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAgencyWorkspace = ensureAgencyWorkspace;
exports.createAgencyClient = createAgencyClient;
exports.updateAgencyWorkspace = updateAgencyWorkspace;
exports.inviteClientViewer = inviteClientViewer;
exports.acceptAgencyInvitation = acceptAgencyInvitation;
exports.getAgencyOverview = getAgencyOverview;
exports.generateWeeklyAgencyReports = generateWeeklyAgencyReports;
exports.getAgencyReportPdf = getAgencyReportPdf;
const crypto_1 = __importDefault(require("crypto"));
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const userRepository_1 = require("../repositories/userRepository");
const analysisRepository_1 = require("../repositories/analysisRepository");
const agencyRepository_1 = require("../repositories/agencyRepository");
function cuid(prefix) {
    return `${prefix}_${crypto_1.default.randomBytes(12).toString("hex")}`;
}
function addDays(date, days) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
function weekStart(date = new Date()) {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = start.getUTCDay() || 7;
    start.setUTCDate(start.getUTCDate() - day + 1);
    return start;
}
function escapePdf(value) {
    return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function buildPdf(lines) {
    const content = [
        "BT",
        "/F1 18 Tf",
        "50 770 Td",
        ...lines.flatMap((line, index) => [
            index === 0 ? "" : "0 -24 Td",
            `(${escapePdf(line).slice(0, 100)}) Tj`,
        ]).filter(Boolean),
        "ET",
    ].join("\n");
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
        offsets.push(Buffer.byteLength(pdf));
        pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf);
}
async function requireAgencyRole(userId, workspaceId, allowed) {
    const role = await agencyRepository_1.AgencyRepository.getMemberRole(userId, workspaceId);
    if (!role || !allowed.includes(role))
        throw new Error("Agency workspace access denied");
    return role;
}
async function ensureAgencyWorkspace(userId) {
    const existing = await agencyRepository_1.AgencyRepository.findWorkspaceByUser(userId);
    if (existing)
        return existing;
    const user = await userRepository_1.UserRepository.findById(userId);
    const workspaceId = cuid("agw");
    const now = new Date();
    const name = user?.storeName ?? (user?.name ? `${user.name}'s agency` : "Operon Agency");
    await agencyRepository_1.AgencyRepository.createWorkspace(workspaceId, userId, name, now);
    await agencyRepository_1.AgencyRepository.createMember(cuid("agm"), workspaceId, userId, "owner", now);
    return (await agencyRepository_1.AgencyRepository.findWorkspaceByUser(userId));
}
async function createAgencyClient(userId, input) {
    const workspace = await ensureAgencyWorkspace(userId);
    await requireAgencyRole(userId, workspace.id, ["owner", "member"]);
    const now = new Date();
    const clientId = cuid("agc");
    await agencyRepository_1.AgencyRepository.createClient(clientId, workspace.id, input.name, input.contactEmail ?? null, input.storeUrl ?? null, now);
    return { id: clientId, workspaceId: workspace.id, ...input };
}
async function updateAgencyWorkspace(userId, input) {
    const workspace = await ensureAgencyWorkspace(userId);
    await requireAgencyRole(userId, workspace.id, ["owner"]);
    await agencyRepository_1.AgencyRepository.updateWorkspace(workspace.id, input.name ?? null, input.logoUrl ?? workspace.logoUrl);
    return ensureAgencyWorkspace(userId);
}
async function inviteClientViewer(userId, clientId, email) {
    const workspace = await ensureAgencyWorkspace(userId);
    await requireAgencyRole(userId, workspace.id, ["owner", "member"]);
    const client = await agencyRepository_1.AgencyRepository.findClientById(clientId, workspace.id);
    if (!client)
        throw new Error("Client not found");
    const token = crypto_1.default.randomBytes(24).toString("hex");
    const now = new Date();
    await agencyRepository_1.AgencyRepository.createClientInvite(cuid("agm"), workspace.id, clientId, email, token, addDays(now, 14), now);
    return { inviteUrl: `/agency/invite/${token}`, token };
}
async function acceptAgencyInvitation(input) {
    const invite = await agencyRepository_1.AgencyRepository.findPendingInvite(input.token);
    if (!invite)
        throw new Error("Invitation is invalid or expired");
    if (invite.invitedEmail && invite.invitedEmail.toLowerCase() !== input.email.toLowerCase()) {
        throw new Error("Invitation email does not match");
    }
    let user = await userRepository_1.UserRepository.findByEmail(input.email);
    if (user) {
        const valid = await (0, password_1.comparePassword)(input.password, user.password);
        if (!valid)
            throw new Error("Password is incorrect for this email");
    }
    else {
        user = await userRepository_1.UserRepository.create({
            email: input.email,
            name: input.name,
            password: await (0, password_1.hashPassword)(input.password),
        });
    }
    await agencyRepository_1.AgencyRepository.acceptInvite(invite.id, user.id);
    if (invite.clientId) {
        await agencyRepository_1.AgencyRepository.setClientUserId(invite.clientId, user.id);
    }
    return { token: (0, jwt_1.signToken)({ userId: user.id, email: user.email }), user };
}
async function getAgencyOverview(userId) {
    const workspace = await ensureAgencyWorkspace(userId);
    const role = await requireAgencyRole(userId, workspace.id, ["owner", "member", "view_only"]);
    const viewOnlyClientId = role === "view_only"
        ? await agencyRepository_1.AgencyRepository.getViewOnlyClientId(workspace.id, userId)
        : null;
    const clients = await agencyRepository_1.AgencyRepository.findClientsByWorkspace(workspace.id, viewOnlyClientId);
    const reports = await agencyRepository_1.AgencyRepository.findReportsByWorkspace(workspace.id, 20);
    const week = addDays(new Date(), -7);
    const kills = await analysisRepository_1.AnalysisRepository.findByUserSince(workspace.ownerId, week, 50);
    const killItems = kills
        .filter((analysis) => analysis.result?.decision?.finalDecision === "KILL")
        .map((analysis) => ({
        id: analysis.id,
        createdAt: analysis.createdAt,
        clientName: clients.find((client) => JSON.stringify(analysis.inputData).toLowerCase().includes(client.name.toLowerCase()))?.name ?? "Unassigned",
        reason: analysis.result?.decision?.shortReason ?? "KILL verdict",
    }));
    return {
        workspace,
        role,
        clients,
        clientCount: clients.length,
        killsThisWeek: killItems.length,
        killItems: killItems.slice(0, 10),
        reports,
        pricingAnchor: "Agency tier should anchor at 5-15x prosumer pricing with per-seat billing.",
    };
}
async function generateWeeklyAgencyReports() {
    const workspaces = await agencyRepository_1.AgencyRepository.findAllWorkspaces();
    let generated = 0;
    const currentWeek = weekStart();
    for (const workspace of workspaces) {
        const clients = await agencyRepository_1.AgencyRepository.findClientsByWorkspace(workspace.id);
        for (const client of clients) {
            const exists = await agencyRepository_1.AgencyRepository.findReportExists(client.id, currentWeek);
            if (exists)
                continue;
            const since = addDays(currentWeek, -7);
            const analyses = await analysisRepository_1.AnalysisRepository.findByUserBetween(workspace.ownerId, since, currentWeek, 25);
            const matching = analyses.filter((analysis) => JSON.stringify(analysis.inputData).toLowerCase().includes(client.name.toLowerCase()));
            const verdicts = matching.map((analysis) => analysis.result?.decision?.finalDecision ?? "WATCH");
            const kills = verdicts.filter((verdict) => verdict === "KILL").length;
            const scales = verdicts.filter((verdict) => verdict === "SCALE").length;
            const summary = {
                clientName: client.name,
                agencyName: workspace.name,
                verdicts: matching.length,
                kills,
                scales,
                weekStart: currentWeek.toISOString(),
            };
            const pdf = buildPdf([
                workspace.name,
                workspace.logoUrl ? `Agency logo: ${workspace.logoUrl}` : "Agency logo: not set",
                `Weekly Operon report: ${client.name}`,
                `Week of ${currentWeek.toISOString().slice(0, 10)}`,
                `Verdicts reviewed: ${matching.length}`,
                `KILL calls: ${kills}`,
                `SCALE calls: ${scales}`,
                "Generated automatically by Operon.",
            ]);
            await agencyRepository_1.AgencyRepository.createReport(cuid("agr"), workspace.id, client.id, currentWeek, summary, pdf.toString("base64"), `${client.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-operon-weekly.pdf`);
            generated += 1;
        }
    }
    return { generated };
}
async function getAgencyReportPdf(userId, reportId) {
    const workspace = await ensureAgencyWorkspace(userId);
    await requireAgencyRole(userId, workspace.id, ["owner", "member", "view_only"]);
    const row = await agencyRepository_1.AgencyRepository.findReportPdf(reportId, workspace.id);
    if (!row)
        throw new Error("Report not found");
    return { filename: row.filename, buffer: Buffer.from(row.pdfBase64, "base64") };
}
