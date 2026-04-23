ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS active_pet_id TEXT;

UPDATE profiles
SET active_pet_id = 'pet-1'
WHERE active_pet_id IS NULL OR active_pet_id = '';
