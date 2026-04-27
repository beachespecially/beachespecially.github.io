-- SQL Script to set up push notifications table in Supabase
-- Run this in your Supabase SQL Editor

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  keys JSONB NOT NULL,
  subscription_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index on endpoint for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Enable Row Level Security (RLS)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is a simple app)
-- In production, you'd want more restrictive policies
CREATE POLICY "Allow all operations on push_subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: Create a function to clean up old/duplicate subscriptions
CREATE OR REPLACE FUNCTION cleanup_old_subscriptions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete subscriptions older than 90 days that haven't been updated
  DELETE FROM push_subscriptions
  WHERE updated_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Optional: Add a comment
COMMENT ON TABLE push_subscriptions IS 'Stores push notification subscriptions for wall of shame alerts';
