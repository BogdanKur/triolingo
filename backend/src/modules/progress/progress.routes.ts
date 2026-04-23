import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { sendError } from "../../shared/http.js";
import { getProgressReport, getProgressStatistics, getProgressSummary } from "./progress.service.js";

export const progressRouter = Router();

progressRouter.get("/progress/summary", requireAuth, async (req, res) => {
  try {
    const summary = await getProgressSummary((req as AuthedRequest).auth.userId);
    if (!summary) {
      sendError(res, 404, "Progress summary not found");
      return;
    }
    res.json(summary);
  } catch {
    sendError(res, 500, "Failed to load progress summary");
  }
});

progressRouter.get("/progress/statistics", requireAuth, async (req, res) => {
  try {
    const data = await getProgressStatistics((req as AuthedRequest).auth.userId);
    res.json(data);
  } catch {
    sendError(res, 500, "Failed to load progress statistics");
  }
});

progressRouter.get("/progress/report", requireAuth, async (req, res) => {
  try {
    const report = await getProgressReport((req as AuthedRequest).auth.userId);
    res.json(report);
  } catch {
    sendError(res, 500, "Failed to load progress report");
  }
});
