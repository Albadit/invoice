-- Add default invoice language to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
