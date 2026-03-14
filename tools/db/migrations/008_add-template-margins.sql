-- Migration 008: Create pdf_margins table and add margin_id FK to templates
-- Stores PDF margin presets as selectable records (system + user-defined)

-- Create the pdf_margins table
CREATE TABLE IF NOT EXISTS pdf_margins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    top TEXT NOT NULL DEFAULT '25.4mm',
    "right" TEXT NOT NULL DEFAULT '31.8mm',
    bottom TEXT NOT NULL DEFAULT '25.4mm',
    "left" TEXT NOT NULL DEFAULT '31.8mm',
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed system presets
INSERT INTO pdf_margins (name, top, "right", bottom, "left", is_system) VALUES
  ('Normal',   '25.4mm', '31.8mm', '25.4mm', '31.8mm', true),
  ('Narrow',   '12.7mm', '12.7mm', '12.7mm', '12.7mm', true),
  ('Moderate', '25.4mm', '19.1mm', '25.4mm', '19.1mm', true),
  ('Wide',     '25.4mm', '50.8mm', '25.4mm', '50.8mm', true);

-- Remove old JSONB margins column if it exists, add margin_id FK
ALTER TABLE templates DROP COLUMN IF EXISTS margins;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS margin_id UUID REFERENCES pdf_margins(id) ON DELETE SET NULL;
