import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../../config.js";

export interface ProviderProfile {
  providerUserId: string;
  email: string | null;
  name: string;
}

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const telegramJwks = createRemoteJWKSet(new URL("https://oauth.telegram.org/.well-known/jwks.json"));

const requireGoogleConfig = (): void => {
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new Error("Google OAuth is not configured");
  }
};

const requireTelegramConfig = (): void => {
  if (!config.telegramClientId || !config.telegramClientSecret) {
    throw new Error("Telegram OAuth is not configured");
  }
};

const postForm = async <T>(url: string, params: URLSearchParams, extraHeaders?: Record<string, string>): Promise<T> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(extraHeaders ?? {}),
    },
    body: params.toString(),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error_description" in payload
        ? String((payload as { error_description?: string }).error_description ?? "OAuth token exchange failed")
        : typeof payload === "object" && payload && "error" in payload
          ? String((payload as { error?: string }).error ?? "OAuth token exchange failed")
          : "OAuth token exchange failed";
    throw new Error(message);
  }

  return payload as T;
};

export const buildGoogleAuthorizationUrl = (params: {
  state: string;
  codeChallenge: string;
  redirectUri: string;
}): string => {
  requireGoogleConfig();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.googleClientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
};

export const exchangeGoogleCode = async (params: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<ProviderProfile> => {
  requireGoogleConfig();

  const tokenResponse = await postForm<{
    access_token: string;
    id_token: string;
    token_type: string;
  }>(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      code: params.code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
      code_verifier: params.codeVerifier,
    }),
  );

  const verification = await jwtVerify(tokenResponse.id_token, googleJwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: config.googleClientId,
  });

  const providerUserId = String(verification.payload.sub ?? "");
  if (!providerUserId) {
    throw new Error("Google profile is missing subject");
  }

  const emailClaim = verification.payload.email;
  const nameClaim = verification.payload.name;

  return {
    providerUserId,
    email: typeof emailClaim === "string" ? emailClaim : null,
    name: typeof nameClaim === "string" && nameClaim.trim() ? nameClaim : "Google user",
  };
};

export const buildTelegramAuthorizationUrl = (params: {
  state: string;
  codeChallenge: string;
  redirectUri: string;
}): string => {
  requireTelegramConfig();
  const url = new URL("https://oauth.telegram.org/auth");
  url.searchParams.set("client_id", config.telegramClientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
};

export const exchangeTelegramCode = async (params: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<ProviderProfile> => {
  requireTelegramConfig();

  const basic = Buffer.from(`${config.telegramClientId}:${config.telegramClientSecret}`, "utf8").toString("base64");

  const tokenResponse = await postForm<{
    access_token: string;
    id_token: string;
    token_type: string;
  }>(
    "https://oauth.telegram.org/token",
    new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: config.telegramClientId,
      code_verifier: params.codeVerifier,
    }),
    {
      Authorization: `Basic ${basic}`,
    },
  );

  const verification = await jwtVerify(tokenResponse.id_token, telegramJwks, {
    issuer: "https://oauth.telegram.org",
    audience: config.telegramClientId,
  });

  const providerUserId = String(verification.payload.sub ?? "");
  if (!providerUserId) {
    throw new Error("Telegram profile is missing subject");
  }

  const emailClaim = verification.payload.email;
  const nameClaim = verification.payload.name;
  const usernameClaim = verification.payload.preferred_username;

  const displayName =
    (typeof nameClaim === "string" && nameClaim.trim()) ||
    (typeof usernameClaim === "string" && usernameClaim.trim()) ||
    "Telegram user";

  return {
    providerUserId,
    email: typeof emailClaim === "string" ? emailClaim : null,
    name: displayName,
  };
};
