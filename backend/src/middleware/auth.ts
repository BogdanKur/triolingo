import type { NextFunction, Request, Response } from "express";
import { sendError } from "../shared/http.js";
import { verifyToken } from "../shared/jwt.js";

export interface AuthedRequest extends Request {
  auth: {
    userId: number;
    provider: "google" | "telegram";
  };
}

const toBearerToken = (header: string | undefined): string | null => {
  if (!header) return null;
  const [kind, token] = header.split(" ");
  if (kind !== "Bearer" || !token) return null;
  return token;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = toBearerToken(req.header("authorization"));
  if (!token) {
    sendError(res, 401, "Missing bearer token");
    return;
  }

  try {
    const payload = verifyToken(token);
    (req as AuthedRequest).auth = {
      userId: payload.sub,
      provider: payload.provider,
    };
    next();
  } catch {
    sendError(res, 401, "Invalid token");
  }
};
