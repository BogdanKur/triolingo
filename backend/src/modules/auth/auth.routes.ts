import { type Response, Router } from "express";
import { ZodError } from "zod";
import { config } from "../../config.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { sendError } from "../../shared/http.js";
import { getMe, oauthLogin, oauthPayloadSchema, oauthProviderSchema } from "./auth.service.js";
import {
  buildGoogleAuthorizationUrl,
  buildTelegramAuthorizationUrl,
  exchangeGoogleCode,
  exchangeTelegramCode,
} from "./oauth.providers.js";
import {
  cleanupExpiredOAuthTransactions,
  consumeOAuthTransaction,
  generatePkcePair,
  generateState,
  saveOAuthTransaction,
} from "./oauth-state.service.js";

export const authRouter = Router();

const defaultOrigin = config.corsOrigins[0] ?? "http://localhost:5173";

const isLocalOrPrivateHostname = (hostname: string): boolean =>
  hostname === "localhost"
  || hostname === "127.0.0.1"
  || /^10\./.test(hostname)
  || /^192\.168\./.test(hostname)
  || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

const isAllowedOrigin = (origin: string): boolean => {
  if (config.corsOrigins.includes(origin)) return true;
  try {
    const parsed = new URL(origin);
    return isLocalOrPrivateHostname(parsed.hostname);
  } catch {
    return false;
  }
};

const resolveOrigin = (originInput: unknown): string => {
  const origin = typeof originInput === "string" && originInput.trim() ? originInput.trim() : defaultOrigin;
  if (!isAllowedOrigin(origin)) {
    throw new Error("Invalid OAuth origin");
  }
  return origin;
};

const getProviderCallbackUri = (provider: "google" | "telegram"): string =>
  new URL(`/api/auth/${provider}/callback`, config.publicApiBaseUrl).toString();

const redirectSuccess = (res: Response, origin: string, payload: { token: string; user: unknown }): void => {
  const callbackUrl = new URL("/auth-callback.html", origin);
  const userEncoded = Buffer.from(JSON.stringify(payload.user), "utf8").toString("base64url");
  callbackUrl.hash = new URLSearchParams({
    token: payload.token,
    user: userEncoded,
  }).toString();
  res.redirect(callbackUrl.toString());
};

const redirectFailure = (res: Response, origin: string, message: string): void => {
  const callbackUrl = new URL("/auth-callback.html", origin);
  callbackUrl.hash = new URLSearchParams({
    error: message,
  }).toString();
  res.redirect(callbackUrl.toString());
};

authRouter.post("/oauth/:provider", async (req, res) => {
  try {
    const provider = oauthProviderSchema.parse(req.params.provider);
    const payload = oauthPayloadSchema.parse(req.body);
    const result = await oauthLogin(provider, payload);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      sendError(res, 400, "Invalid auth payload", error.flatten());
      return;
    }
    sendError(res, 500, "OAuth login failed");
  }
});

authRouter.get("/google/start", async (req, res) => {
  try {
    cleanupExpiredOAuthTransactions();
    const origin = resolveOrigin(req.query.origin);
    const { codeVerifier, codeChallenge } = generatePkcePair();
    const state = generateState();
    await saveOAuthTransaction(state, {
      provider: "google",
      origin,
      codeVerifier,
      createdAt: Date.now(),
    });

    const authorizationUrl = buildGoogleAuthorizationUrl({
      state,
      codeChallenge,
      redirectUri: getProviderCallbackUri("google"),
    });
    res.redirect(authorizationUrl);
  } catch (error) {
    sendError(res, 500, error instanceof Error ? error.message : "Failed to start Google OAuth");
  }
});

authRouter.get("/google/callback", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  const oauthError = typeof req.query.error === "string" ? req.query.error : null;

  if (!state) {
    sendError(res, 400, "Missing OAuth state");
    return;
  }

  const tx = await consumeOAuthTransaction(state);
  if (!tx || tx.provider !== "google") {
    sendError(res, 400, "Invalid OAuth state");
    return;
  }

  if (oauthError) {
    redirectFailure(res, tx.origin, oauthError);
    return;
  }

  if (!code) {
    redirectFailure(res, tx.origin, "Missing authorization code");
    return;
  }

  try {
    const profile = await exchangeGoogleCode({
      code,
      redirectUri: getProviderCallbackUri("google"),
      codeVerifier: tx.codeVerifier,
    });

    const session = await oauthLogin("google", {
      oauthId: profile.providerUserId,
      email: profile.email ?? undefined,
      name: profile.name,
    });

    redirectSuccess(res, tx.origin, session);
  } catch (error) {
    redirectFailure(res, tx.origin, error instanceof Error ? error.message : "Google OAuth failed");
  }
});

authRouter.get("/telegram/start", async (req, res) => {
  try {
    cleanupExpiredOAuthTransactions();
    const origin = resolveOrigin(req.query.origin);
    const { codeVerifier, codeChallenge } = generatePkcePair();
    const state = generateState();
    await saveOAuthTransaction(state, {
      provider: "telegram",
      origin,
      codeVerifier,
      createdAt: Date.now(),
    });

    const authorizationUrl = buildTelegramAuthorizationUrl({
      state,
      codeChallenge,
      redirectUri: getProviderCallbackUri("telegram"),
    });
    res.redirect(authorizationUrl);
  } catch (error) {
    sendError(res, 500, error instanceof Error ? error.message : "Failed to start Telegram OAuth");
  }
});

authRouter.get("/telegram/callback", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  const oauthError = typeof req.query.error === "string" ? req.query.error : null;

  if (!state) {
    sendError(res, 400, "Missing OAuth state");
    return;
  }

  const tx = await consumeOAuthTransaction(state);
  if (!tx || tx.provider !== "telegram") {
    sendError(res, 400, "Invalid OAuth state");
    return;
  }

  if (oauthError) {
    redirectFailure(res, tx.origin, oauthError);
    return;
  }

  if (!code) {
    redirectFailure(res, tx.origin, "Missing authorization code");
    return;
  }

  try {
    const profile = await exchangeTelegramCode({
      code,
      redirectUri: getProviderCallbackUri("telegram"),
      codeVerifier: tx.codeVerifier,
    });

    const session = await oauthLogin("telegram", {
      oauthId: profile.providerUserId,
      email: profile.email ?? undefined,
      name: profile.name,
    });

    redirectSuccess(res, tx.origin, session);
  } catch (error) {
    redirectFailure(res, tx.origin, error instanceof Error ? error.message : "Telegram OAuth failed");
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const { userId } = (req as AuthedRequest).auth;
    const user = await getMe(userId);
    if (!user) {
      sendError(res, 404, "User not found");
      return;
    }
    res.json({ user });
  } catch {
    sendError(res, 500, "Failed to fetch current user");
  }
});

authRouter.post("/logout", requireAuth, (_req, res) => {
  // JWT is stateless. Client drops the token.
  res.json({ success: true });
});
