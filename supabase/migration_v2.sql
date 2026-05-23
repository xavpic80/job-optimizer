-- Migration V2: Contact LinkedIn PDFs, AI backgrounds, posting dates, profile assets

-- Contacts: LinkedIn PDF + AI Background
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_pdf_path TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_pdf_text TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_background JSONB;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_background_at TIMESTAMPTZ;

-- Jobs: explicit posting date
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posting_date DATE;

-- Profile assets (portfolio, certifications, recommendations, etc.)
CREATE TABLE IF NOT EXISTS profile_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'other',
  file_path TEXT,
  extracted_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profile_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profile_assets' AND policyname = 'assets_own'
  ) THEN
    CREATE POLICY "assets_own" ON profile_assets FOR ALL USING (user_id = auth.uid());
  END IF;
END
$$;
