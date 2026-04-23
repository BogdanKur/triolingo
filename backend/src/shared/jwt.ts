import jwt from "jsonwebtoken";
import { config } from "../config.js";

export interface AuthTokenPayload {
  sub: number;
  provider: "google" | "telegram";
}

export const signToken = (payload: AuthTokenPayload): string =>
  jwt.sign(payload, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: "7d",
  });

export const verifyToken = (token: string): AuthTokenPayload => {
  const payload = jwt.verify(token, config.jwtSecret);
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid auth token payload");
  }

  const subRaw = Reflect.get(payload, "sub");
  const providerRaw = Reflect.get(payload, "provider");

  const sub = typeof subRaw === "number" ? subRaw : Number(subRaw);
  if (!Number.isFinite(sub)) {
    throw new Error("Invalid subject claim");
  }

  if (providerRaw !== "google" && providerRaw !== "telegram") {
    throw new Error("Invalid provider claim");
  }

  return { sub, provider: providerRaw };
};
