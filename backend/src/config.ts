import "dotenv/config";

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: toNumber(process.env.PORT, 4000),
  jwtSecret: process.env.JWT_SECRET ?? "triolingo-dev-secret",
  databaseUrl: process.env.DATABASE_URL ?? "postgres://triolingo:triolingo@localhost:5432/triolingo",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  publicApiBaseUrl: process.env.PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  telegramClientId: process.env.TELEGRAM_CLIENT_ID ?? "",
  telegramClientSecret: process.env.TELEGRAM_CLIENT_SECRET ?? "",
};
