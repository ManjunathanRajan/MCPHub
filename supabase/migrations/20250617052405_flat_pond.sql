/*
  # Create Missing Tables and Functions Only

  This migration only creates the missing tables and functions that are causing the errors,
  without attempting to recreate existing policies or tables.

  1. Missing Tables
    - `security_scan_results` - Track security scans with results
    - `server_vulnerabilities` - Detailed vulnerability tracking  
    - `server_reputation` - Trust scores and reputation metrics
    - `security_policies` - Configurable security policies

  2. Missing Functions
    - `search_mcp_servers` - Enhanced search with proper parameters
    - `increment_downloads` - Download counter function

  3. Security
    - Enable RLS on new tables only
    - Add policies for new tables only
*/

-- Create Security Scan Results table (if not exists)
CREATE TABLE IF NOT EXISTS security_scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES mcp_servers(id) ON DELETE CASCADE,
  scan_type text NOT NULL DEFAULT 'dependency',
  scan_version text NOT NULL DEFAULT '1.0.0',
  status text NOT NULL DEFAULT 'pending',
  severity text DEFAULT 'info',
  vulnerabilities jsonb DEFAULT '[]',
  recommendations jsonb DEFAULT '[]',
  scan_duration_ms integer,
  scanned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create Server Vulnerabilities table (if not exists)
CREATE TABLE IF NOT EXISTS server_vulnerabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES mcp_servers(id) ON DELETE CASCADE,
  vulnerability_id text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  affected_versions text[] DEFAULT '{}',
  fixed_version text,
  status text DEFAULT 'open',
  first_detected timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create Server Reputation table (if not exists)
CREATE TABLE IF NOT EXISTS server_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES mcp_servers(id) ON DELETE CASCADE,
  trust_score integer DEFAULT 50,
  reputation_factors jsonb DEFAULT '{}',
  community_reports integer DEFAULT 0,
  false_positive_reports integer DEFAULT 0,
  last_calculated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(server_id)
);

-- Create Security Policies table (if not exists)
CREATE TABLE IF NOT EXISTS security_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  policy_type text NOT NULL DEFAULT 'vulnerability',
  severity_threshold text NOT NULL DEFAULT 'medium',
  auto_action text DEFAULT 'flag',
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables only
DO $$
BEGIN
  -- Only enable RLS if table exists and RLS is not already enabled
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_scan_results') THEN
    ALTER TABLE security_scan_results ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'server_vulnerabilities') THEN
    ALTER TABLE server_vulnerabilities ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'server_reputation') THEN
    ALTER TABLE server_reputation ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_policies') THEN
    ALTER TABLE security_policies ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS Policies for new tables only (with conflict handling)
DO $$
BEGIN
  -- Security scan results policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'security_scan_results' 
    AND policyname = 'Anyone can read security scan results'
  ) THEN
    CREATE POLICY "Anyone can read security scan results"
      ON security_scan_results FOR SELECT TO public USING (true);
  END IF;

  -- Server vulnerabilities policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'server_vulnerabilities' 
    AND policyname = 'Anyone can read vulnerabilities'
  ) THEN
    CREATE POLICY "Anyone can read vulnerabilities"
      ON server_vulnerabilities FOR SELECT TO public USING (true);
  END IF;

  -- Server reputation policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'server_reputation' 
    AND policyname = 'Anyone can read server reputation'
  ) THEN
    CREATE POLICY "Anyone can read server reputation"
      ON server_reputation FOR SELECT TO public USING (true);
  END IF;

  -- Security policies policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'security_policies' 
    AND policyname = 'Anyone can read security policies'
  ) THEN
    CREATE POLICY "Anyone can read security policies"
      ON security_policies FOR SELECT TO public USING (true);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_scan_results_server_id ON security_scan_results (server_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_server_vulnerabilities_server_id ON server_vulnerabilities (server_id, severity, status);
CREATE INDEX IF NOT EXISTS idx_server_reputation_server_id ON server_reputation (server_id);

-- Drop existing search function and recreate with correct signature
DROP FUNCTION IF EXISTS search_mcp_servers(jsonb);
DROP FUNCTION IF EXISTS search_mcp_servers(text, text, integer, boolean);
DROP FUNCTION IF EXISTS search_mcp_servers(text, integer, integer, text, boolean);

-- Create the search function that matches what the frontend expects
CREATE OR REPLACE FUNCTION search_mcp_servers(
  search_query text DEFAULT '',
  category_filter text DEFAULT 'all',
  min_security_score integer DEFAULT 0,
  verified_only boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  category text,
  security_score integer,
  downloads integer,
  rating decimal,
  compatibility text[],
  last_updated timestamptz,
  author text,
  verified boolean,
  tags text[],
  install_command text,
  github_url text,
  created_at timestamptz,
  updated_at timestamptz,
  search_rank real,
  trust_score integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.description,
    s.category,
    s.security_score,
    s.downloads,
    s.rating,
    s.compatibility,
    s.last_updated,
    s.author,
    s.verified,
    s.tags,
    s.install_command,
    s.github_url,
    s.created_at,
    s.updated_at,
    CASE 
      WHEN search_query = '' THEN 1.0
      ELSE ts_rank(
        to_tsvector('english', COALESCE(s.name, '') || ' ' || COALESCE(s.description, '') || ' ' || COALESCE(s.author, '')),
        plainto_tsquery('english', search_query)
      )
    END::real as search_rank,
    COALESCE(r.trust_score, 50) as trust_score
  FROM mcp_servers s
  LEFT JOIN server_reputation r ON s.id = r.server_id
  WHERE 
    (search_query = '' OR 
     s.name ILIKE '%' || search_query || '%' OR 
     s.description ILIKE '%' || search_query || '%' OR 
     s.author ILIKE '%' || search_query || '%' OR
     EXISTS (SELECT 1 FROM unnest(s.tags) AS tag WHERE tag ILIKE '%' || search_query || '%'))
    AND (category_filter = 'all' OR s.category = category_filter)
    AND s.security_score >= min_security_score
    AND (NOT verified_only OR s.verified = true)
  ORDER BY 
    search_rank DESC,
    s.downloads DESC,
    s.rating DESC
  LIMIT 50;
END;
$$;

-- Create increment downloads function (if not exists)
CREATE OR REPLACE FUNCTION increment_downloads(server_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE mcp_servers 
  SET downloads = downloads + 1 
  WHERE id = server_id;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION search_mcp_servers TO authenticated;
GRANT EXECUTE ON FUNCTION search_mcp_servers TO anon;
GRANT EXECUTE ON FUNCTION increment_downloads TO authenticated;

-- Insert default security policies (if table is empty)
INSERT INTO security_policies (name, description, policy_type, severity_threshold, auto_action) 
SELECT * FROM (VALUES
  ('Critical Vulnerability Policy', 'Automatically flag servers with critical vulnerabilities', 'vulnerability', 'critical', 'flag'),
  ('High Risk Dependency Policy', 'Monitor servers with high-risk dependencies', 'dependency', 'high', 'flag'),
  ('License Compliance Policy', 'Ensure license compatibility', 'license', 'medium', 'flag'),
  ('Malware Detection Policy', 'Detect and quarantine malicious code', 'vulnerability', 'critical', 'quarantine')
) AS v(name, description, policy_type, severity_threshold, auto_action)
WHERE NOT EXISTS (SELECT 1 FROM security_policies LIMIT 1);

-- Initialize reputation scores for existing servers (if reputation table is empty)
DO $$
DECLARE
  server_record record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM server_reputation LIMIT 1) THEN
    FOR server_record IN SELECT id FROM mcp_servers LOOP
      INSERT INTO server_reputation (server_id, trust_score, reputation_factors, last_calculated)
      VALUES (server_record.id, 50, '{"base_score": 50}'::jsonb, now())
      ON CONFLICT (server_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Add sample security scan data (if table is empty)
INSERT INTO security_scan_results (server_id, scan_type, scan_version, status, severity, vulnerabilities, recommendations, scan_duration_ms) 
SELECT 
  id,
  'dependency',
  '1.0.0',
  'completed',
  CASE 
    WHEN security_score >= 95 THEN 'low'
    WHEN security_score >= 90 THEN 'medium'
    ELSE 'high'
  END,
  CASE 
    WHEN security_score < 90 THEN 
      jsonb_build_array(
        jsonb_build_object(
          'id', 'CVE-2023-' || (1000 + (random() * 9000)::int),
          'severity', 'medium',
          'description', 'Potential security vulnerability in dependency'
        )
      )
    ELSE '[]'::jsonb
  END,
  jsonb_build_array(
    jsonb_build_object(
      'type', 'update',
      'description', 'Update dependencies to latest versions'
    )
  ),
  (500 + random() * 2000)::int
FROM mcp_servers
WHERE NOT EXISTS (SELECT 1 FROM security_scan_results LIMIT 1);

-- Force schema reload
NOTIFY pgrst, 'reload schema';