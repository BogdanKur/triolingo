import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { sendError } from "../../shared/http.js";
import {
  getProfile,
  getSettings,
  patchProfile,
  patchSettings,
  switchLanguageSchema,
  switchLearningLanguage,
  updateProfileSchema,
  updateSettingsSchema,
} from "./profile.service.js";

export const profileRouter = Router();

profileRouter.get("/profile", requireAuth, async (req, res) => {
  try {
    const profile = await getProfile((req as AuthedRequest).auth.userId);
    if (!profile) {
      sendError(res, 404, "Profile not found");
      return;
    }
    res.json({ profile });
  } catch {
    sendError(res, 500, "Failed to load profile");
  }
});

profileRouter.patch("/profile", requireAuth, async (req, res) => {
  try {
    const payload = updateProfileSchema.parse(req.body);
    const profile = await patchProfile((req as AuthedRequest).auth.userId, payload);
    if (!profile) {
      sendError(res, 404, "Profile not found");
      return;
    }
    res.json({ profile });
  } catch (error) {
    if (error instanceof ZodError) {
      sendError(res, 400, "Invalid profile payload", error.flatten());
      return;
    }
    if (error instanceof Error && error.message === "PET_NOT_OWNED") {
      sendError(res, 400, "Pet is not owned");
      return;
    }
    sendError(res, 500, "Failed to update profile");
  }
});

profileRouter.get("/settings", requireAuth, async (req, res) => {
  try {
    const settings = await getSettings((req as AuthedRequest).auth.userId);
    if (!settings) {
      sendError(res, 404, "Settings not found");
      return;
    }
    res.json({ settings });
  } catch {
    sendError(res, 500, "Failed to load settings");
  }
});

profileRouter.patch("/settings", requireAuth, async (req, res) => {
  try {
    const payload = updateSettingsSchema.parse(req.body);
    const settings = await patchSettings((req as AuthedRequest).auth.userId, payload);
    if (!settings) {
      sendError(res, 404, "Settings not found");
      return;
    }
    res.json({ settings });
  } catch (error) {
    if (error instanceof ZodError) {
      sendError(res, 400, "Invalid settings payload", error.flatten());
      return;
    }
    sendError(res, 500, "Failed to update settings");
  }
});

profileRouter.post("/language/switch", requireAuth, async (req, res) => {
  try {
    const payload = switchLanguageSchema.parse(req.body);
    const response = await switchLearningLanguage((req as AuthedRequest).auth.userId, payload.language);
    res.json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      sendError(res, 400, "Invalid language payload", error.flatten());
      return;
    }
    sendError(res, 500, "Failed to switch learning language");
  }
});
