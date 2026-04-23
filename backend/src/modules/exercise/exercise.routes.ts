import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { sendError } from "../../shared/http.js";
import { checkExercise, exerciseTypeSchema } from "./exercise.service.js";

export const exerciseRouter = Router();

exerciseRouter.post("/exercises/:type/check", requireAuth, async (req, res) => {
  try {
    const type = exerciseTypeSchema.parse(req.params.type);
    const result = await checkExercise((req as AuthedRequest).auth.userId, type, req.body);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      sendError(res, 400, "Invalid exercise payload", error.flatten());
      return;
    }
    if (error instanceof Error) {
      if (error.message === "DAILY_TASK_ALREADY_DONE") {
        sendError(res, 409, "Daily task is already finished for today");
        return;
      }
      if (error.message === "DAILY_TASK_INVALID_STEP_ORDER") {
        sendError(res, 400, "Mini lesson step order is invalid");
        return;
      }
      if (error.message === "DAILY_TASK_TYPE_MISMATCH" || error.message === "DAILY_TASK_MINI_STEP_REQUIRED") {
        sendError(res, 400, "Daily task payload is invalid");
        return;
      }
    }
    sendError(res, 500, "Failed to check exercise");
  }
});
