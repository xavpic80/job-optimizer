-- Migration v3: Add from_id / to_id to communications for iMessage-style threading

ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS from_id TEXT,   -- 'me' or contact UUID
  ADD COLUMN IF NOT EXISTS to_id   TEXT;   -- 'me' or contact UUID
