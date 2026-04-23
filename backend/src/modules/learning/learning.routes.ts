import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { sendError } from "../../shared/http.js";
import { assessmentSubmitSchema, getDailyPlan, submitAssessment } from "./learning.service.js";

export const learningRouter = Router();

learningRouter.post("/assessment/submit", requireAuth, async (req, res) => {
  try {
    const payload = assessmentSubmitSchema.parse(req.body);
    const result = await submitAssessment((req as AuthedRequest).auth.userId, payload);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      sendError(res, 400, "Invalid assessment payload", error.flatten());
      return;
    }
    sendError(res, 500, "Failed to submit assessment");
  }
});

learningRouter.get("/plan/daily", requireAuth, async (req, res) => {
  try {
    const plan = await getDailyPlan((req as AuthedRequest).auth.userId);
    res.json(plan);
  } catch {
    sendError(res, 500, "Failed to build daily plan");
  }
});
