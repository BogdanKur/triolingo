ALTER TABLE user_progress
  ALTER COLUMN crystals SET DEFAULT 0;

UPDATE user_progress
SET crystals = 0
WHERE crystals = 125
  AND total_xp = 0
  AND current_streak = 0
  AND longest_streak = 0;

CREATE TABLE IF NOT EXISTS daily_task_states (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  step_index INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, task_date, task_id),
  CHECK (status IN ('in_progress', 'passed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_daily_task_states_user_date
  ON daily_task_states (user_id, task_date);
