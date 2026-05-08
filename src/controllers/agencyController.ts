import type { Request, Response } from "express";
import { z } from "zod";
import {
  acceptAgencyInvitation,
  createAgencyClient,
  ensureAgencyWorkspace,
  generateWeeklyAgencyReports,
  getAgencyOverview,
  getAgencyReportPdf,
  inviteClientViewer,
  updateAgencyWorkspace,
} from "../services/agencyService";
import { asyncHandler } from "../utils/asyncHandler";

const clientSchema = z.object({
  name: z.string().min(2).max(120),
  contactEmail: z.string().email().optional(),
  storeUrl: z.string().max(240).optional(),
});

const inviteSchema = z.object({ email: z.string().email() });

const acceptSchema = z.object({
  token: z.string().min(12),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(120).optional(),
});

const workspaceSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  logoUrl: z.string().url().nullable().optional(),
});

export const getAgencyOverviewController = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await getAgencyOverview(req.auth!.userId));
});

export const updateAgencyWorkspaceController = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await updateAgencyWorkspace(req.auth!.userId, workspaceSchema.parse(req.body)));
});

export const createAgencyClientController = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await createAgencyClient(req.auth!.userId, clientSchema.parse(req.body)));
});

export const inviteClientViewerController = asyncHandler(async (req: Request, res: Response) => {
  const body = inviteSchema.parse(req.body);
  res.status(200).json(await inviteClientViewer(req.auth!.userId, String(req.params.clientId), body.email));
});

export const acceptAgencyInvitationController = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await acceptAgencyInvitation(acceptSchema.parse(req.body)));
});

export const generateAgencyReportsController = asyncHandler(async (req: Request, res: Response) => {
  await ensureAgencyWorkspace(req.auth!.userId);
  res.status(200).json(await generateWeeklyAgencyReports());
});

export const downloadAgencyReportController = asyncHandler(async (req: Request, res: Response) => {
  const report = await getAgencyReportPdf(req.auth!.userId, String(req.params.reportId));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
  res.status(200).send(report.buffer);
});
