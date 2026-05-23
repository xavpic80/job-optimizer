-- JobOptimizer MVP Schema
-- Run this in your Supabase SQL Editor

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  phone VARCHAR(20),
  location VARCHAR(255),
  headline TEXT,
  summary TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- CV Versions Table
CREATE TABLE cv_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER DEFAULT 1,
  cv_text TEXT NOT NULL,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Only one current CV per user
CREATE UNIQUE INDEX unique_current_cv ON cv_versions(user_id) WHERE is_current = true;

-- Jobs Table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  salary_min INTEGER,
  salary_max INTEGER,
  description TEXT NOT NULL,
  requirements TEXT,
  benefits TEXT,
  job_type VARCHAR(50),
  remote_type VARCHAR(50),
  source VARCHAR(50) NOT NULL,
  source_url TEXT,
  source_job_id VARCHAR(255),
  posted_date TIMESTAMP,
  keywords TEXT[],
  match_score INTEGER,
  canonical_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  is_duplicate BOOLEAN DEFAULT false,
  raw_html TEXT,
  parsed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_jobs_user_created ON jobs(user_id, created_at DESC);
CREATE INDEX idx_jobs_duplicate ON jobs(canonical_job_id);

-- Applications Table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(50) DEFAULT 'saved',
  applied_date DATE,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  match_score INTEGER,
  notes TEXT,
  cv_version_id UUID REFERENCES cv_versions(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE (user_id, job_id)
);

CREATE INDEX idx_applications_user_status ON applications(user_id, status);
CREATE INDEX idx_applications_job ON applications(job_id);

-- Communications Table
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL,
  direction VARCHAR(20),
  date_sent TIMESTAMP NOT NULL,
  from_address VARCHAR(255),
  to_address VARCHAR(255),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  message_status VARCHAR(50) DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_communications_application ON communications(application_id);
CREATE INDEX idx_communications_date ON communications(date_sent);

-- Transcripts Table
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  interview_date TIMESTAMP NOT NULL,
  interview_type VARCHAR(50),
  interviewer_name VARCHAR(255),
  duration_minutes INTEGER,
  transcript_text TEXT NOT NULL,
  coaching_json JSONB,
  next_steps TEXT[],
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_transcripts_application ON transcripts(application_id);

-- Coaching Insights Table
CREATE TABLE coaching_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE NOT NULL,
  insight_type VARCHAR(50),
  feedback TEXT NOT NULL,
  key_moment TEXT,
  suggestion TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_coaching_transcript ON coaching_insights(transcript_id);

-- Optimization History Table
CREATE TABLE optimization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  optimization_type VARCHAR(50),
  optimized_content TEXT,
  prompt_used TEXT,
  claude_model VARCHAR(50),
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_optimization_application ON optimization_history(application_id);
CREATE INDEX idx_optimization_type ON optimization_history(optimization_type);

-- Company Data Table
CREATE TABLE company_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  glassdoor_rating FLOAT,
  glassdoor_review_count INTEGER,
  glassdoor_url TEXT,
  glassdoor_interview_questions JSONB,
  average_salary_range JSONB,
  fetched_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "users_own" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "cv_versions_own" ON cv_versions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "jobs_own" ON jobs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "applications_own" ON applications FOR ALL USING (user_id = auth.uid());

CREATE POLICY "communications_own" ON communications FOR ALL USING (
  application_id IN (SELECT id FROM applications WHERE user_id = auth.uid())
);
CREATE POLICY "transcripts_own" ON transcripts FOR ALL USING (
  application_id IN (SELECT id FROM applications WHERE user_id = auth.uid())
);
CREATE POLICY "coaching_own" ON coaching_insights FOR ALL USING (
  transcript_id IN (
    SELECT t.id FROM transcripts t
    JOIN applications a ON t.application_id = a.id
    WHERE a.user_id = auth.uid()
  )
);
CREATE POLICY "optimization_own" ON optimization_history FOR ALL USING (
  application_id IN (SELECT id FROM applications WHERE user_id = auth.uid())
);
