UPDATE user_progress
SET crystals = 0,
    updated_at = NOW()
WHERE crystals = 125;
