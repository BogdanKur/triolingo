import { createClient } from "redis";
import { config } from "../config.js";

export const redis = createClient({
  url: config.redisUrl,
});

let hasConnected = false;

export const ensureRedisConnected = async (): Promise<void> => {
  if (hasConnected) return;
  try {
    await redis.connect();
    hasConnected = true;
  } catch (error) {
    console.warn("Redis is unavailable. Continuing without cache.", error);
  }
};

export const safeRedisGet = async (key: string): Promise<string | null> => {
  try {
    if (!hasConnected) return null;
    return await redis.get(key);
  } catch {
    return null;
  }
};

export const safeRedisSet = async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
  try {
    if (!hasConnected) return;
    if (ttlSeconds) {
      await redis.set(key, value, { EX: ttlSeconds });
      return;
    }
    await redis.set(key, value);
  } catch {
    // No-op by design for resilient fallback mode.
  }
};

export const safeRedisDel = async (key: string): Promise<void> => {
  try {
    if (!hasConnected) return;
    await redis.del(key);
  } catch {
    // No-op by design for resilient fallback mode.
  }
};
