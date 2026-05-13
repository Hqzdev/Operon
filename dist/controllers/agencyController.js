"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadAgencyReportController = exports.generateAgencyReportsController = exports.acceptAgencyInvitationController = exports.inviteClientViewerController = exports.createAgencyClientController = exports.updateAgencyWorkspaceController = exports.getAgencyOverviewController = void 0;
const zod_1 = require("zod");
const agencyService_1 = require("../services/agencyService");
const asyncHandler_1 = require("../utils/asyncHandler");
const clientSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120),
    contactEmail: zod_1.z.string().email().optional(),
    storeUrl: zod_1.z.string().max(240).optional(),
});
const inviteSchema = zod_1.z.object({ email: zod_1.z.string().email() });
const acceptSchema = zod_1.z.object({
    token: zod_1.z.string().min(12),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    name: zod_1.z.string().max(120).optional(),
});
const workspaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120).optional(),
    logoUrl: zod_1.z.string().url().nullable().optional(),
});
exports.getAgencyOverviewController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.status(200).json(await (0, agencyService_1.getAgencyOverview)(req.auth.userId));
});
exports.updateAgencyWorkspaceController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.status(200).json(await (0, agencyService_1.updateAgencyWorkspace)(req.auth.userId, workspaceSchema.parse(req.body)));
});
exports.createAgencyClientController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.status(201).json(await (0, agencyService_1.createAgencyClient)(req.auth.userId, clientSchema.parse(req.body)));
});
exports.inviteClientViewerController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = inviteSchema.parse(req.body);
    res.status(200).json(await (0, agencyService_1.inviteClientViewer)(req.auth.userId, String(req.params.clientId), body.email));
});
exports.acceptAgencyInvitationController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.status(201).json(await (0, agencyService_1.acceptAgencyInvitation)(acceptSchema.parse(req.body)));
});
exports.generateAgencyReportsController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await (0, agencyService_1.ensureAgencyWorkspace)(req.auth.userId);
    res.status(200).json(await (0, agencyService_1.generateWeeklyAgencyReports)());
});
exports.downloadAgencyReportController = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const report = await (0, agencyService_1.getAgencyReportPdf)(req.auth.userId, String(req.params.reportId));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
    res.status(200).send(report.buffer);
});
