-- Migration: Add exchange_rate to currencies and invoices tables
-- Enables currency conversion support throughout the app.

-- Add exchange_rate to currencies (default 1.0 = base currency)
ALTER TABLE currencies
  ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(18, 8) NOT NULL DEFAULT 1.0;

-- Add exchange_rate to invoices (snapshot of rate at time of creation)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(18, 8) NOT NULL DEFAULT 1.0;

-- Update existing system currencies with sensible default rates (relative to USD as base)
UPDATE currencies SET exchange_rate = 1.0       WHERE code = 'USD';
UPDATE currencies SET exchange_rate = 0.92      WHERE code = 'EUR';
UPDATE currencies SET exchange_rate = 0.79      WHERE code = 'GBP';
UPDATE currencies SET exchange_rate = 149.50    WHERE code = 'JPY';
UPDATE currencies SET exchange_rate = 0.88      WHERE code = 'CHF';

-- Backfill existing invoices: set exchange_rate from their currency's current rate
UPDATE invoices i
SET exchange_rate = c.exchange_rate
FROM currencies c
WHERE i.currency_id = c.id
  AND i.exchange_rate = 1.0;
