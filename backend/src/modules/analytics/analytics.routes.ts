import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { sendError } from "../../shared/http.js";
import { buildImprovementReport, getStudyStatistics } from "./analytics.service.js";

export const analyticsRouter = Router();

analyticsRouter.get("/analytics/overview", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthedRequest).auth.userId;
    const statistics = await getStudyStatistics(userId);
    const report = await buildImprovementReport(userId);
    res.json({ statistics, report });
  } catch {
    sendError(res, 500, "Failed to load analytics");
  }
});
