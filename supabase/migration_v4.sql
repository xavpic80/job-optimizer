-- Migration v4: Server-side AI output cache (cross-device sync)
-- Stores fit_assessment, meeting_prep, comms_coach, and optimize results
-- type column encodes context: 'fit_assessment', 'comms_coach', 'optimize',
--   'meeting_prep:none', or 'meeting_prep:<contact-uuid>'

CREATE TABLE IF NOT EXISTS ai_outputs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  data          JSONB NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (application_id, type)
);

ALTER TABLE ai_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ai_outputs"
  ON ai_outputs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
