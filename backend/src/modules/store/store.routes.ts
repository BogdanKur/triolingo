import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { sendError } from "../../shared/http.js";
import { createPurchase, getStoreCatalog, purchaseSchema, subscriptionUpgradeSchema, upgradeSubscription } from "./store.service.js";

export const storeRouter = Router();

storeRouter.get("/store/catalog", requireAuth, async (_req, res) => {
  try {
    const catalog = await getStoreCatalog((_req as AuthedRequest).auth.userId);
    res.json(catalog);
  } catch {
    sendError(res, 500, "Failed to load store catalog");
  }
});

storeRouter.post("/store/purchase", requireAuth, async (req, res) => {
  try {
    const payload = purchaseSchema.parse(req.body);
    const data = await createPurchase((req as AuthedRequest).auth.userId, payload);
    res.json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      sendError(res, 400, "Invalid purchase payload", error.flatten());
      return;
    }

    const message = error instanceof Error ? error.message : "Purchase failed";
    if (message === "NOT_ENOUGH_CRYSTALS") {
      sendError(res, 400, "Not enough crystals");
      return;
    }
    if (message === "PET_ALREADY_OWNED") {
      sendError(res, 409, "Pet already owned");
      return;
    }
    if (message === "INVALID_PET_ID") {
      sendError(res, 400, "Invalid pet id");
      return;
    }

    sendError(res, 500, "Failed to process purchase");
  }
});

storeRouter.post("/subscription/upgrade", requireAuth, async (req, res) => {
  try {
    const payload = subscriptionUpgradeSchema.parse(req.body);
    const data = await upgradeSubscription((req as AuthedRequest).auth.userId, payload);
    res.json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      sendError(res, 400, "Invalid subscription payload", error.flatten());
      return;
    }
    sendError(res, 500, "Failed to upgrade subscription");
  }
});
