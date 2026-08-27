-- ==============================================================================
-- agentK Supabase Database Migration & Schema
-- Run this in your Supabase SQL Editor (https://app.supabase.com)
-- This script is fully idempotent (safe to run on both new and existing tables)
-- ==============================================================================

-- 1. Profiles Table (Create or Alter)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS did TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS x_handle TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS x_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS x_avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS x_bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS x_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add Unique Constraints if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_x_handle_key'
  ) THEN
    BEGIN
      ALTER TABLE profiles ADD CONSTRAINT profiles_x_handle_key UNIQUE (x_handle);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_x_handle ON profiles(x_handle);
CREATE INDEX IF NOT EXISTS idx_profiles_did ON profiles(did);

-- 2. Verification Codes Table
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  x_handle TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS x_handle TEXT;
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_handle ON verification_codes(x_handle);

-- 3. User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- 4. X Contributions Table
CREATE TABLE IF NOT EXISTS x_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id TEXT UNIQUE NOT NULL,
  tweet_url TEXT NOT NULL,
  user_handle TEXT NOT NULL,
  did TEXT,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT,
  tweet_type TEXT DEFAULT 'post',
  posted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'detected',
  reply_tweet_id TEXT,
  reply_media_id TEXT,
  reply_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS tweet_id TEXT;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS tweet_url TEXT;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS user_handle TEXT;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS did TEXT;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS tweet_type TEXT DEFAULT 'post';
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'detected';
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS reply_tweet_id TEXT;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS reply_media_id TEXT;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS reply_at TIMESTAMPTZ;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS is_relevant BOOLEAN DEFAULT FALSE;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS llm_model TEXT;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS llm_response TEXT;
ALTER TABLE x_contributions ADD COLUMN IF NOT EXISTS llm_evaluated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_x_contributions_handle ON x_contributions(user_handle);
CREATE INDEX IF NOT EXISTS idx_x_contributions_tweet_id ON x_contributions(tweet_id);
CREATE INDEX IF NOT EXISTS idx_x_contributions_status ON x_contributions(status);
CREATE INDEX IF NOT EXISTS idx_x_contributions_is_relevant ON x_contributions(is_relevant);
CREATE INDEX IF NOT EXISTS idx_x_contributions_posted_at ON x_contributions(posted_at DESC);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_contributions ENABLE ROW LEVEL SECURITY;

-- Allow public read policies
DROP POLICY IF EXISTS "Public read profiles" ON profiles;
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read contributions" ON x_contributions;
CREATE POLICY "Public read contributions" ON x_contributions FOR SELECT USING (true);
