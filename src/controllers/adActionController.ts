import type { Request, Response } from "express";
import {
  executeAdAction,
  listAdActionLogs,
  undoAdAction,
  updateActionGuardrail,
} from "../services/adActionService";
import { asyncHandler } from "../utils/asyncHandler";

export const executeAdActionController = asyncHandler(async (req: Request, res: Response) => {
  const action = await executeAdAction(req.auth!.userId, req.body);
  res.json({ action });
});

export const listAdActionLogsController = asyncHandler(async (req: Request, res: Response) => {
  const logs = await listAdActionLogs(req.auth!.userId);
  res.json({ logs });
});

export const undoAdActionController = asyncHandler(async (req: Request, res: Response) => {
  const action = await undoAdAction(req.auth!.userId, req.params.id as string);
  res.json({ action });
});

export const updateActionGuardrailController = asyncHandler(async (req: Request, res: Response) => {
  const result = await updateActionGuardrail(req.auth!.userId, req.body);
  res.json({ result });
});
