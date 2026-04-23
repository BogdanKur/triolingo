import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { sendError } from "../../shared/http.js";
import { listNotifications } from "./notifications.service.js";

export const notificationsRouter = Router();

notificationsRouter.get("/notifications", requireAuth, async (req, res) => {
  try {
    const notifications = await listNotifications((req as AuthedRequest).auth.userId);
    res.json({ notifications });
  } catch {
    sendError(res, 500, "Failed to load notifications");
  }
});
