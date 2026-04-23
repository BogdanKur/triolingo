import { query } from "../../db/pool.js";

export const normalizeLegacyCrystals = async (userId: number, language: string, crystals: number): Promise<number> => {
  if (crystals !== 125) {
    return crystals;
  }

  await query(
    `
      UPDATE user_progress
      SET crystals = 0, updated_at = NOW()
      WHERE user_id = $1
        AND language = $2
        AND crystals = 125
    `,
    [userId, language],
  );

  return 0;
};
