import type { Response } from "express";

export interface ApiErrorShape {
  error: string;
  details?: unknown;
}

export const sendError = (res: Response, status: number, error: string, details?: unknown): Response<ApiErrorShape> =>
  res.status(status).json({ error, details });
