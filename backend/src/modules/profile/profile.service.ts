import { z } from "zod";
import { query } from "../../db/pool.js";

const petIdSchema = z.string().regex(/^pet-[1-9]$/);

export const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    avatar: z.string().max(500).nullable().optional(),
    notificationLevel: z.enum(["off", "important", "all"]).optional(),
    preferredLanguage: z.string().min(2).max(12).optional(),
    activePetId: petIdSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required",
  });

export const updateSettingsSchema = z
  .object({
    musicEnabled: z.boolean().optional(),
    soundEnabled: z.boolean().optional(),
    telegramNotifications: z.boolean().optional(),
    nightMode: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one settings field is required",
  });

export const switchLanguageSchema = z.object({
  language: z.string().min(2).max(12),
});

export interface ProfileView {
  userId: number;
  email: string | null;
  name: string;
  avatar: string | null;
  activePetId: string | null;
  ownedPetIds: string[];
  notificationLevel: string;
  preferredLanguage: string;
  learningLanguage: string;
  subscriptionStatus: string;
}

export interface SettingsView {
  musicEnabled: boolean;
  soundEnabled: boolean;
  telegramNotifications: boolean;
  nightMode: boolean;
}

const getOwnedPetIds = async (userId: number): Promise<string[]> => {
  const result = await query<{ item_id: string }>(
    `
      SELECT DISTINCT item_id
      FROM purchases
      WHERE user_id = $1
        AND item_type = 'pet'
        AND status = 'success'
    `,
    [userId],
  );

  const ids = result.rows
    .map((row) => row.item_id)
    .filter((itemId) => /^pet-[1-9]$/.test(itemId));

  if (!ids.includes("pet-1")) {
    ids.push("pet-1");
  }

  return ids.sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));
};

const canUsePet = async (userId: number, petId: string): Promise<boolean> => {
  const owned = await getOwnedPetIds(userId);
  return owned.includes(petId);
};

export const getProfile = async (userId: number): Promise<ProfileView | null> => {
  const result = await query<{
    user_id: number;
    email: string | null;
    name: string;
    avatar: string | null;
    active_pet_id: string | null;
    owned_pet_ids: string[] | null;
    notification_level: string;
    preferred_language: string;
    learning_language: string;
    subscription_status: string;
  }>(
    `
    SELECT
      u.id AS user_id,
      u.email,
      u.name,
      p.avatar,
      COALESCE(NULLIF(p.active_pet_id, ''), 'pet-1') AS active_pet_id,
      COALESCE(
        (
          SELECT ARRAY_AGG(DISTINCT purchases.item_id ORDER BY purchases.item_id)
          FROM purchases
          WHERE purchases.user_id = u.id
            AND purchases.item_type = 'pet'
            AND purchases.status = 'success'
        ),
        ARRAY[]::text[]
      ) AS owned_pet_ids,
      p.notification_level,
      p.preferred_language,
      p.learning_language,
      u.subscription_status
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    WHERE u.id = $1
  `,
    [userId],
  );

  const row = result.rows[0];
  if (!row) return null;

  const ownedPetIds = Array.from(
    new Set(
      [
        "pet-1",
        ...((row.owned_pet_ids ?? []).filter((petId) => /^pet-[1-9]$/.test(petId))),
      ],
    ),
  ).sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));

  return {
    userId: row.user_id,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
    activePetId: row.active_pet_id ?? "pet-1",
    ownedPetIds,
    notificationLevel: row.notification_level,
    preferredLanguage: row.preferred_language,
    learningLanguage: row.learning_language,
    subscriptionStatus: row.subscription_status,
  };
};

export const patchProfile = async (userId: number, payload: z.infer<typeof updateProfileSchema>): Promise<ProfileView | null> => {
  if (payload.activePetId) {
    const allowed = await canUsePet(userId, payload.activePetId);
    if (!allowed) {
      throw new Error("PET_NOT_OWNED");
    }
  }

  await query(
    `
    UPDATE users
    SET name = COALESCE($2, name)
    WHERE id = $1
  `,
    [userId, payload.name ?? null],
  );

  await query(
    `
    UPDATE profiles
    SET
      avatar = COALESCE($2, avatar),
      notification_level = COALESCE($3, notification_level),
      preferred_language = COALESCE($4, preferred_language),
      active_pet_id = COALESCE($5, active_pet_id)
    WHERE user_id = $1
  `,
    [userId, payload.avatar ?? null, payload.notificationLevel ?? null, payload.preferredLanguage ?? null, payload.activePetId ?? null],
  );

  return getProfile(userId);
};

export const getSettings = async (userId: number): Promise<SettingsView | null> => {
  const result = await query<{
    music_enabled: boolean;
    sound_enabled: boolean;
    telegram_notifications: boolean;
    night_mode: boolean;
  }>(
    `
    SELECT music_enabled, sound_enabled, telegram_notifications, night_mode
    FROM settings
    WHERE user_id = $1
  `,
    [userId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    musicEnabled: row.music_enabled,
    soundEnabled: row.sound_enabled,
    telegramNotifications: row.telegram_notifications,
    nightMode: row.night_mode,
  };
};

export const patchSettings = async (userId: number, payload: z.infer<typeof updateSettingsSchema>): Promise<SettingsView | null> => {
  await query(
    `
    UPDATE settings
    SET
      music_enabled = COALESCE($2, music_enabled),
      sound_enabled = COALESCE($3, sound_enabled),
      telegram_notifications = COALESCE($4, telegram_notifications),
      night_mode = COALESCE($5, night_mode),
      updated_at = NOW()
    WHERE user_id = $1
  `,
    [
      userId,
      payload.musicEnabled ?? null,
      payload.soundEnabled ?? null,
      payload.telegramNotifications ?? null,
      payload.nightMode ?? null,
    ],
  );

  return getSettings(userId);
};

export const switchLearningLanguage = async (userId: number, language: string): Promise<{ language: string }> => {
  await query(
    `
    UPDATE profiles
    SET learning_language = $2
    WHERE user_id = $1
  `,
    [userId, language],
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
      weak_topics,
      last_activity_date
    )
    VALUES ($1, $2, 'A1', 0, 0, 0, 0, 0, '[]'::jsonb, NULL)
    ON CONFLICT (user_id, language) DO NOTHING
  `,
    [userId, language],
  );

  return { language };
};
