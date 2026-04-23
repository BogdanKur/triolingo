import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { exerciseRouter } from "./modules/exercise/exercise.routes.js";
import { learningRouter } from "./modules/learning/learning.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { profileRouter } from "./modules/profile/profile.routes.js";
import { progressRouter } from "./modules/progress/progress.routes.js";
import { storeRouter } from "./modules/store/store.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { sendError } from "./shared/http.js";

export const app = express();

const isLocalOrPrivateHostname = (hostname: string): boolean =>
  hostname === "localhost"
  || hostname === "127.0.0.1"
  || /^10\./.test(hostname)
  || /^192\.168\./.test(hostname)
  || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      try {
        const parsed = new URL(origin);
        if (isLocalOrPrivateHostname(parsed.hostname)) {
          callback(null, true);
          return;
        }
      } catch {
        // invalid origin
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "triolingo-api" });
});

app.use("/api/auth", authRouter);
app.use("/api", profileRouter);
app.use("/api", learningRouter);
app.use("/api", exerciseRouter);
app.use("/api", progressRouter);
app.use("/api", storeRouter);
app.use("/api", notificationsRouter);
app.use("/api", analyticsRouter);

app.use((_req, res) => {
  sendError(res, 404, "Route not found");
});
