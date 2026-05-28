-- Create the analytics_events table for Pocket Khata telemetry
-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor)
-- This is safe to run multiple times (uses IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('screen_view', 'user_action', 'error', 'device_info')),
  event_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_info JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast time-range queries (used for dashboards)
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events (timestamp DESC);

-- Index for filtering by event type (used for breakdown analysis)
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (event_type);

-- Index for searching by event name (used for behavior analysis)
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events (event_name);

-- Composite index for dashboard queries: type + time range
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_ts ON analytics_events (event_type, timestamp DESC);

-- Enable Row Level Security (recommended for multi-user setups)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert (the anon key can only insert, not read)
CREATE POLICY IF NOT EXISTS "Allow anonymous insert" ON analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Block anonymous reads (data is only viewable in the Supabase dashboard)
CREATE POLICY IF NOT EXISTS "Block anonymous select" ON analytics_events
  FOR SELECT
  TO anon
  USING (false);
