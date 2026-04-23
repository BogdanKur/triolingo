import { query } from "../../db/pool.js";

export interface NotificationItem {
  id: number;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const createNotification = async (userId: number, type: string, message: string): Promise<void> => {
  await query(
    `
      INSERT INTO notifications (user_id, type, message)
      VALUES ($1, $2, $3)
    `,
    [userId, type, message],
  );
};

export const listNotifications = async (userId: number): Promise<NotificationItem[]> => {
  const rows = await query<{
    id: number;
    type: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }>(
    `
      SELECT id, type, message, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `,
    [userId],
  );

  return rows.rows.map((row) => ({
    id: row.id,
    type: row.type,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  }));
};

export const createStreakRiskNotificationIfNeeded = async (userId: number, currentStreak: number): Promise<void> => {
  if (currentStreak <= 0) return;
  const alreadySent = await query<{ exists: boolean }>(
    `
      SELECT EXISTS(
        SELECT 1
        FROM notifications
        WHERE user_id = $1
          AND type = 'streak-risk'
          AND created_at::date = CURRENT_DATE
      ) AS exists
    `,
    [userId],
  );
  if (alreadySent.rows[0]?.exists) return;

  await createNotification(userId, "streak-risk", `Ваш стрик ${currentStreak} под угрозой. Завершите урок сегодня.`);
};

export const runStreakRiskSweep = async (): Promise<number> => {
  const rows = await query<{ user_id: number; current_streak: number }>(
    `
      SELECT up.user_id, up.current_streak
      FROM user_progress up
      WHERE up.current_streak > 0
        AND (up.last_activity_date IS NULL OR up.last_activity_date < CURRENT_DATE)
    `,
  );

  for (const row of rows.rows) {
    await createStreakRiskNotificationIfNeeded(row.user_id, row.current_streak);
  }

  return rows.rowCount ?? 0;
};
