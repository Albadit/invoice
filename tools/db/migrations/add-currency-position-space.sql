-- Migration: Add symbol_position and symbol_space to currencies table
-- These fields control how the currency symbol is displayed relative to the amount:
--   symbol_position: 'left' (e.g., $100) or 'right' (e.g., 100$)
--   symbol_space: true adds a space between symbol and amount (e.g., $ 100 or 100 $)

-- Create enum type for symbol position
DO $$ BEGIN
    CREATE TYPE symbol_position_type AS ENUM ('left', 'right');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Convert existing column from TEXT to enum (or add if not exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'currencies' AND column_name = 'symbol_position'
  ) THEN
    -- Drop the old CHECK constraint if it exists
    ALTER TABLE currencies DROP CONSTRAINT IF EXISTS chk_symbol_position;
    -- Drop default before type conversion, then re-add
    ALTER TABLE currencies ALTER COLUMN symbol_position DROP DEFAULT;
    ALTER TABLE currencies
      ALTER COLUMN symbol_position TYPE symbol_position_type USING symbol_position::symbol_position_type;
    ALTER TABLE currencies ALTER COLUMN symbol_position SET DEFAULT 'left';
  ELSE
    ALTER TABLE currencies
      ADD COLUMN symbol_position symbol_position_type NOT NULL DEFAULT 'left';
  END IF;
END $$;

ALTER TABLE currencies
  ADD COLUMN IF NOT EXISTS symbol_space BOOLEAN NOT NULL DEFAULT false;

-- Drop the broken updated_at trigger (currencies table has no updated_at column)
DROP TRIGGER IF EXISTS update_currencies_updated_at ON currencies;
