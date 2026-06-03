-- Migration v5: add pdf_path to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pdf_path TEXT;
