import { z } from "zod";
import { query } from "../../db/pool.js";
import { createNotification } from "../notifications/notifications.service.js";
import { normalizeLegacyCrystals } from "../progress/crystal-baseline.service.js";

export const purchaseSchema = z.object({
  itemType: z.enum(["pet", "crystal-pack", "course", "subscription"]),
  itemId: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.enum(["crystal", "rub"]),
});

export const subscriptionUpgradeSchema = z.object({
  planId: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.enum(["crystal", "rub"]),
});

const getLearningLanguage = async (userId: number): Promise<string> => {
  const result = await query<{ learning_language: string }>(
    `
      SELECT learning_language
      FROM profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );
  return result.rows[0]?.learning_language ?? "en";
};

const updateCrystals = async (userId: number, delta: number): Promise<number> => {
  const language = await getLearningLanguage(userId);
  const progress = await query<{ crystals: number }>(
    `
      SELECT crystals
      FROM user_progress
      WHERE user_id = $1 AND language = $2
      LIMIT 1
    `,
    [userId, language],
  );
  const legacyCurrent = progress.rows[0]?.crystals ?? 0;
  const current = await normalizeLegacyCrystals(userId, language, legacyCurrent);
  const next = current + delta;
  if (next < 0) {
    throw new Error("NOT_ENOUGH_CRYSTALS");
  }

  await query(
    `
      UPDATE user_progress
      SET crystals = $3, updated_at = NOW()
      WHERE user_id = $1 AND language = $2
    `,
    [userId, language, next],
  );
  return next;
};

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

const isPetOwned = async (userId: number, petId: string): Promise<boolean> => {
  const result = await query<{ exists: boolean }>(
    `
      SELECT EXISTS(
        SELECT 1
        FROM purchases
        WHERE user_id = $1
          AND item_type = 'pet'
          AND item_id = $2
          AND status = 'success'
      ) AS exists
    `,
    [userId, petId],
  );

  return Boolean(result.rows[0]?.exists);
};

export const getStoreCatalog = async (userId: number) => {
  const courses = await query<{
    id: number;
    title: string;
    description: string;
    level: string;
    is_premium: boolean;
  }>(
    `
      SELECT id, title, description, level, is_premium
      FROM courses
      ORDER BY id ASC
    `,
  );

  const ownedPetIds = await getOwnedPetIds(userId);
  const profile = await query<{ active_pet_id: string | null }>(
    `
      SELECT active_pet_id
      FROM profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  return {
    courses: courses.rows.map((course) => ({
      id: String(course.id),
      title: course.title,
      description: course.description,
      level: course.level,
      kind: course.is_premium ? "premium" : "default",
      price: course.is_premium ? 999 : 0,
      currency: "rub",
    })),
    customization: [
      { id: "pet-1", itemType: "pet", title: "Pet 1", amount: 15, currency: "crystal" },
      { id: "pet-2", itemType: "pet", title: "Pet 2", amount: 15, currency: "crystal" },
      { id: "pet-3", itemType: "pet", title: "Pet 3", amount: 15, currency: "crystal" },
      { id: "pet-4", itemType: "pet", title: "Pet 4", amount: 15, currency: "crystal" },
      { id: "pet-5", itemType: "pet", title: "Pet 5", amount: 15, currency: "crystal" },
      { id: "pet-6", itemType: "pet", title: "Pet 6", amount: 15, currency: "crystal" },
      { id: "pet-7", itemType: "pet", title: "Pet 7", amount: 15, currency: "crystal" },
      { id: "pet-8", itemType: "pet", title: "Pet 8", amount: 15, currency: "crystal" },
      { id: "pet-9", itemType: "pet", title: "Pet 9", amount: 15, currency: "crystal" },
      { id: "crystal-pack-1", itemType: "crystal-pack", title: "Crystals x15", amount: 99, currency: "rub" },
    ],
    subscriptions: [{ id: "upgrade-b1", title: "Upgrade level", amount: 999, currency: "rub" }],
    ownedPetIds,
    activePetId: profile.rows[0]?.active_pet_id ?? "pet-1",
  };
};

export const createPurchase = async (userId: number, payload: z.infer<typeof purchaseSchema>) => {
  if (payload.itemType === "pet") {
    if (!/^pet-[1-9]$/.test(payload.itemId)) {
      throw new Error("INVALID_PET_ID");
    }

    const alreadyOwned = payload.itemId === "pet-1" ? true : await isPetOwned(userId, payload.itemId);
    if (alreadyOwned) {
      throw new Error("PET_ALREADY_OWNED");
    }
  }

  if (payload.currency === "crystal") {
    await updateCrystals(userId, -payload.amount);
  } else if (payload.itemType === "crystal-pack") {
    await updateCrystals(userId, 15);
  }

  if (payload.itemType === "subscription") {
    await query(
      `
        UPDATE users
        SET subscription_status = 'premium'
        WHERE id = $1
      `,
      [userId],
    );
  }

  await query(
    `
      INSERT INTO purchases (user_id, item_type, item_id, amount, currency, status)
      VALUES ($1, $2, $3, $4, $5, 'success')
    `,
    [userId, payload.itemType, payload.itemId, payload.amount, payload.currency],
  );

  await createNotification(userId, "purchase", `Purchase ${payload.itemId} completed successfully.`);

  return {
    success: true,
    itemId: payload.itemId,
    itemType: payload.itemType,
  };
};

export const upgradeSubscription = async (userId: number, payload: z.infer<typeof subscriptionUpgradeSchema>) => {
  const result = await createPurchase(userId, {
    itemType: "subscription",
    itemId: payload.planId,
    amount: payload.amount,
    currency: payload.currency,
  });

  await query(
    `
      UPDATE users
      SET subscription_status = 'premium'
      WHERE id = $1
    `,
    [userId],
  );

  return result;
};
