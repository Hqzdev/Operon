import type { Request, Response } from "express";
import { runScenario } from "../services/scenarioService";
import { asyncHandler } from "../utils/asyncHandler";

export const scenarioSimulatorController = asyncHandler(async (req: Request, res: Response) => {
  const result = runScenario(req.body);
  res.status(200).json(result);
});
