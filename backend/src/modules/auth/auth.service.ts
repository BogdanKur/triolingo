import { z } from "zod";
import { query } from "../../db/pool.js";
import { signToken } from "../../shared/jwt.js";

export const oauthProviderSchema = z.union([z.literal("google"), z.literal("telegram")]);

export const oauthPayloadSchema = z.object({
  oauthId: z.string().min(2),
  email: z.string().email().optional(),
  name: z.string().min(1).max(120).optional(),
});

export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
export type OAuthPayload = z.infer<typeof oauthPayloadSchema>;

export interface PublicUser {
  id: number;
  email: string | null;
  name: string;
  role: string;
  subscriptionStatus: string;
  preferredLanguage: string;
  learningLanguage: string;
}

const normalizeId = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid numeric id value");
  }
  return parsed;
};

const ensureUserProfileBundle = async (userId: number): Promise<void> => {
  await query(
    `
    INSERT INTO profiles (user_id)
    VALUES ($1)
    ON CONFLICT (user_id) DO NOTHING
  `,
    [userId],
  );

  await query(
    `
    INSERT INTO settings (user_id)
    VALUES ($1)
    ON CONFLICT (user_id) DO NOTHING
  `,
    [userId],
  );

  await query(
    `
    INSERT INTO user_progress (
      user_id,
      language,
      current_level,
      total_xp,
      crystals,
      current_streak,
      longest_streak,
      accuracy,
      last_activity_date
    )
    VALUES ($1, 'en', 'A1', 0, 0, 0, 0, 0, NULL)
    ON CONFLICT (user_id, language) DO NOTHING
  `,
    [userId],
  );
};

const getPublicUser = async (userId: number): Promise<PublicUser | null> => {
  const result = await query<{
    id: number;
    email: string | null;
    name: string;
    role: string;
    subscription_status: string;
    preferred_language: string;
    learning_language: string;
  }>(
    `
    SELECT
      u.id,
      u.email,
      u.name,
      u.role,
      u.subscription_status,
      p.preferred_language,
      p.learning_language
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    WHERE u.id = $1
    LIMIT 1
  `,
    [userId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: normalizeId(row.id),
    email: row.email,
    name: row.name,
    role: row.role,
    subscriptionStatus: row.subscription_status,
    preferredLanguage: row.preferred_language,
    learningLanguage: row.learning_language,
  };
};

export const oauthLogin = async (provider: OAuthProvider, payload: OAuthPayload): Promise<{ token: string; user: PublicUser }> => {
  const existingAccount = await query<{ user_id: number }>(
    `
    SELECT user_id
    FROM oauth_accounts
    WHERE provider = $1 AND provider_user_id = $2
    LIMIT 1
  `,
    [provider, payload.oauthId],
  );

  let userId = existingAccount.rows[0]?.user_id ? normalizeId(existingAccount.rows[0].user_id) : undefined;
  if (!userId) {
    if (payload.email) {
      const userByEmail = await query<{ id: number }>(
        `
        SELECT id
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
        [payload.email],
      );
      const existingId = userByEmail.rows[0]?.id;
      if (existingId) {
        userId = normalizeId(existingId);
      }
    }

    if (!userId) {
      const fallbackEmail = `${payload.oauthId}@${provider}.stub.local`;
      const createdUser = await query<{ id: number }>(
        `
        INSERT INTO users (email, name)
        VALUES ($1, $2)
        RETURNING id
      `,
        [payload.email ?? fallbackEmail, payload.name ?? `${provider}-user`],
      );
      userId = createdUser.rows[0]?.id ? normalizeId(createdUser.rows[0].id) : undefined;
      if (!userId) throw new Error("Failed to create user");
    }

    await query(
      `
      INSERT INTO oauth_accounts (user_id, provider, provider_user_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (provider, provider_user_id) DO NOTHING
    `,
      [userId, provider, payload.oauthId],
    );
  } else if (payload.name || payload.email) {
    await query(
      `
      UPDATE users
      SET
        name = COALESCE($2, name),
        email = COALESCE($3, email)
      WHERE id = $1
    `,
      [userId, payload.name ?? null, payload.email ?? null],
    );
  }

  await ensureUserProfileBundle(userId);
  const user = await getPublicUser(userId);
  if (!user) throw new Error("Failed to load user profile");

  const token = signToken({ sub: user.id, provider });
  return { token, user };
};

export const getMe = async (userId: number): Promise<PublicUser | null> => getPublicUser(userId);
