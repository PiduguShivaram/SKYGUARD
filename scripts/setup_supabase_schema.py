"""
SkyGuard Supabase PostgreSQL Schema Initializer and Migration Script.
Connects directly to Supabase via the transaction pooler on aws-1-ap-southeast-2.pooler.supabase.com:6543
Enforces zero-trust Row-Level Security (RLS) on user data.
"""
import asyncio
import os
import asyncpg

DB_HOST = os.environ.get("SUPABASE_DB_HOST", "aws-1-ap-southeast-2.pooler.supabase.com")
DB_PORT = int(os.environ.get("SUPABASE_DB_PORT", "6543"))
DB_USER = os.environ.get("SUPABASE_DB_USER", "postgres.fkpennlfmpsgvrnmggwg")
DB_PASS = os.environ.get("SUPABASE_DB_PASS", "")
DB_NAME = os.environ.get("SUPABASE_DB_NAME", "postgres")

SQL_SCHEMA = """
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: saved_locations
CREATE TABLE IF NOT EXISTS public.saved_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'anonymous',
    name VARCHAR(128) NOT NULL,
    formatted_label VARCHAR(256) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    country_code VARCHAR(8),
    timezone VARCHAR(64),
    is_favorite BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for saved_locations
CREATE INDEX IF NOT EXISTS idx_saved_locations_user ON public.saved_locations (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_locations_coords ON public.saved_locations (latitude, longitude);

-- Table: user_alert_preferences
CREATE TABLE IF NOT EXISTS public.user_alert_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    min_severity VARCHAR(32) NOT NULL DEFAULT 'Moderate',
    wants_telegram BOOLEAN NOT NULL DEFAULT false,
    telegram_chat_id VARCHAR(64),
    wants_push BOOLEAN NOT NULL DEFAULT false,
    push_subscription_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: authoritative_alerts
CREATE TABLE IF NOT EXISTS public.authoritative_alerts (
    id VARCHAR(128) PRIMARY KEY,
    event VARCHAR(128) NOT NULL,
    headline TEXT,
    severity VARCHAR(32) NOT NULL,
    urgency VARCHAR(32),
    certainty VARCHAR(32),
    sender VARCHAR(128) NOT NULL,
    area_desc TEXT,
    effective TIMESTAMPTZ,
    expires TIMESTAMPTZ,
    polygons_json TEXT,
    circles_json TEXT,
    geocodes_json TEXT,
    status VARCHAR(32) DEFAULT 'Actual',
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authoritative_alerts ENABLE ROW LEVEL SECURITY;

-- 1. Drop old permissive policies
DROP POLICY IF EXISTS "Allow public read access on saved_locations" ON public.saved_locations;
DROP POLICY IF EXISTS "Allow public insert access on saved_locations" ON public.saved_locations;
DROP POLICY IF EXISTS "Allow public update access on saved_locations" ON public.saved_locations;
DROP POLICY IF EXISTS "Allow public delete access on saved_locations" ON public.saved_locations;
DROP POLICY IF EXISTS "Users can only read own saved_locations" ON public.saved_locations;
DROP POLICY IF EXISTS "Users can only insert own saved_locations" ON public.saved_locations;
DROP POLICY IF EXISTS "Users can only update own saved_locations" ON public.saved_locations;
DROP POLICY IF EXISTS "Users can only delete own saved_locations" ON public.saved_locations;

DROP POLICY IF EXISTS "Allow public access on user_alert_preferences" ON public.user_alert_preferences;
DROP POLICY IF EXISTS "Users can only manage own alert preferences" ON public.user_alert_preferences;

DROP POLICY IF EXISTS "Allow public read access on authoritative_alerts" ON public.authoritative_alerts;

-- 2. Strict authenticated per-user RLS policies on saved_locations
CREATE POLICY "Users can only read own saved_locations"
    ON public.saved_locations FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can only insert own saved_locations"
    ON public.saved_locations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can only update own saved_locations"
    ON public.saved_locations FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can only delete own saved_locations"
    ON public.saved_locations FOR DELETE
    TO authenticated
    USING (auth.uid()::text = user_id);

-- 3. Strict authenticated per-user RLS policies on user_alert_preferences
CREATE POLICY "Users can only manage own alert preferences"
    ON public.user_alert_preferences FOR ALL
    TO authenticated
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 4. Public read-only access for authoritative_alerts
CREATE POLICY "Allow public read access on authoritative_alerts"
    ON public.authoritative_alerts FOR SELECT
    TO anon, authenticated
    USING (true);

-- 5. Revoke unauthenticated access from private tables
REVOKE ALL ON TABLE public.saved_locations FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_locations TO authenticated;
GRANT ALL ON TABLE public.saved_locations TO service_role;

REVOKE ALL ON TABLE public.user_alert_preferences FROM anon, public;
GRANT ALL ON TABLE public.user_alert_preferences TO authenticated;
GRANT ALL ON TABLE public.user_alert_preferences TO service_role;

REVOKE ALL ON TABLE public.authoritative_alerts FROM anon, public;
GRANT SELECT ON TABLE public.authoritative_alerts TO anon, authenticated;
GRANT ALL ON TABLE public.authoritative_alerts TO service_role;

-- 6. Add authoritative_alerts to supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'authoritative_alerts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.authoritative_alerts;
    END IF;
END $$;
"""


async def run_setup():
    if not DB_PASS:
        raise ValueError("SUPABASE_DB_PASS environment variable must be set to run setup.")
    print(f"Connecting to Supabase PostgreSQL at {DB_HOST}:{DB_PORT} as {DB_USER}...")
    conn = await asyncpg.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        ssl="require",
        statement_cache_size=0
    )
    try:
        ver = await conn.fetchval("SELECT version()")
        print("Connected successfully!")
        print(f"PostgreSQL Version: {ver}")
        
        print("Applying hardened SkyGuard RLS schema migration...")
        await conn.execute(SQL_SCHEMA)
        print("Schema migration completed successfully!")
        
        # Verify active policies
        policies = await conn.fetch(
            "SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public'"
        )
        print("\n--- Verified Active RLS Policies in Supabase ---")
        for p in policies:
            print(f"Table: {p['tablename']} | Policy: {p['policyname']} | Roles: {p['roles']} | Cmd: {p['cmd']}")
            
    finally:
        await conn.close()
        print("Connection closed cleanly.")


if __name__ == "__main__":
    asyncio.run(run_setup())
