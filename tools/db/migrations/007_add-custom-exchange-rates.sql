-- Migration 007: Add custom_exchange_rates JSONB column to settings
-- Allows users to override system currency exchange rates per-user

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS custom_exchange_rates JSONB NOT NULL DEFAULT '{}';
