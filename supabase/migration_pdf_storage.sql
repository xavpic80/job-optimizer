-- Migration: Add PDF path storage to cv_versions
-- Run this in your Supabase SQL Editor AFTER creating the storage bucket

-- 1. Add pdf_path column
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS pdf_path TEXT;

-- 2. Create the storage bucket (run this separately in Supabase Dashboard → Storage → New Bucket)
--    Bucket name: cvs
--    Public: NO (private)
--    File size limit: 10MB
--    Allowed MIME types: application/pdf

-- 3. Add storage RLS policy so the service role can manage files
--    (Service role key bypasses RLS by default — no extra policy needed for backend)
