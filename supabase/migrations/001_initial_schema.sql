-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum type for issue status
CREATE TYPE issue_status AS ENUM ('collecting', 'sent');

-- Create subscribers table
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  magic_token UUID DEFAULT gen_random_uuid() NOT NULL
);

-- Create issues table
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status issue_status NOT NULL DEFAULT 'collecting',
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  -- Ensure a subscriber can only submit once per issue
  UNIQUE(issue_id, subscriber_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_submissions_issue_id ON submissions(issue_id);
CREATE INDEX idx_submissions_subscriber_id ON submissions(subscriber_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_subscribers_magic_token ON subscribers(magic_token);

-- Add RLS (Row Level Security) policies
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- For server-side access with service role key, RLS is bypassed
-- These policies are for potential future client-side access

-- Allow reading subscribers (for admin)
CREATE POLICY "Allow service role full access to subscribers" ON subscribers
  FOR ALL USING (true);

-- Allow reading issues
CREATE POLICY "Allow service role full access to issues" ON issues
  FOR ALL USING (true);

-- Allow reading/writing submissions
CREATE POLICY "Allow service role full access to submissions" ON submissions
  FOR ALL USING (true);
