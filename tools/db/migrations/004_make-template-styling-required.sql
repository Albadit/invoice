-- Make templates.styling NOT NULL (styling is now required)
-- Backfill any existing NULL values with empty string first
UPDATE templates SET styling = '' WHERE styling IS NULL;
ALTER TABLE templates ALTER COLUMN styling SET NOT NULL;
ALTER TABLE templates ALTER COLUMN styling SET DEFAULT '';
