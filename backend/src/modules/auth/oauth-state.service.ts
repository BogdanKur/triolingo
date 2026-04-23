import { createHash, randomBytes } from "node:crypto";
import { safeRedisDel, safeRedisGet, safeRedisSet } from "../../db/redis.js";

export type OAuthProviderKind = "google" | "telegram";

export interface OAuthTransaction {
  provider: OAuthProviderKind;
  origin: string;
  codeVerifier: string;
  createdAt: number;
}

const OAUTH_TX_TTL_SECONDS = 10 * 60;
const memoryStore = new Map<string, OAuthTransaction>();

const base64url = (buffer: Buffer): string =>
  buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

export const generatePkcePair = (): { codeVerifier: string; codeChallenge: string } => {
  const codeVerifier = base64url(randomBytes(48));
  const digest = createHash("sha256").update(codeVerifier).digest();
  const codeChallenge = base64url(digest);
  return { codeVerifier, codeChallenge };
};

export const generateState = (): string => base64url(randomBytes(24));

const cacheKey = (state: string): string => `oauth:tx:${state}`;

export const saveOAuthTransaction = async (state: string, tx: OAuthTransaction): Promise<void> => {
  memoryStore.set(state, tx);
  await safeRedisSet(cacheKey(state), JSON.stringify(tx), OAUTH_TX_TTL_SECONDS);
};

export const consumeOAuthTransaction = async (state: string): Promise<OAuthTransaction | null> => {
  const redisRaw = await safeRedisGet(cacheKey(state));
  if (redisRaw) {
    await safeRedisDel(cacheKey(state));
    try {
      return JSON.parse(redisRaw) as OAuthTransaction;
    } catch {
      return null;
    }
  }

  const tx = memoryStore.get(state) ?? null;
  if (tx) {
    memoryStore.delete(state);
  }
  return tx;
};

export const cleanupExpiredOAuthTransactions = (): void => {
  const now = Date.now();
  const cutoff = now - OAUTH_TX_TTL_SECONDS * 1000;
  [...memoryStore.entries()].forEach(([state, tx]) => {
    if (tx.createdAt < cutoff) {
      memoryStore.delete(state);
    }
  });
};
