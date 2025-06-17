/*
  # Complete Database Schema Fix

  This migration consolidates all necessary tables, functions, and relationships
  to resolve the "relation does not exist" errors.

  1. New Tables
    - `mcp_servers` - Main servers table with all required columns
    - `user_favorites` - User favorite servers
    - `server_installations` - Track user installations
    - `security_scan_results` - Security scan data
    - `server_vulnerabilities` - Vulnerability tracking
    - `server_reputation` - Trust scores and reputation
    - `security_policies` - Security policy configuration

  2. Functions
    - `search_mcp_servers` - Advanced search with filters
    - `increment_downloads` - Download counter
    - `calculate_server_reputation` - Reputation calculation

  3. Security
    - Enable RLS on all tables
    - Add appropriate policies for public read access
    - Secure function execution
*/

-- Drop existing tables if they exist (in correct order to handle dependencies)
DROP TABLE IF EXISTS security_scan_results CASCADE;
DROP TABLE IF EXISTS server_vulnerabilities CASCADE;
DROP TABLE IF EXISTS server_reputation CASCADE;
DROP TABLE IF EXISTS security_policies CASCADE;
DROP TABLE IF EXISTS server_installations CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS search_mcp_servers(text, text, integer, boolean);
DROP FUNCTION IF EXISTS increment_downloads(uuid);
DROP FUNCTION IF EXISTS calculate_server_reputation(uuid);
DROP FUNCTION IF EXISTS update_mcp_server_search_vector();

-- Ensure mcp_servers table exists with all required columns
CREATE TABLE IF NOT EXISTS mcp_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  security_score integer NOT NULL DEFAULT 0,
  downloads integer DEFAULT 0,
  rating decimal(2,1) DEFAULT 0.0,
  compatibility text[] DEFAULT '{}',
  last_updated timestamptz DEFAULT now(),
  author text NOT NULL,
  verified boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  install_command text,
  github_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  search_vector tsvector
);

-- Create User Favorites table
CREATE TABLE user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id uuid REFERENCES mcp_servers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, server_id)
);

-- Create Server Installations table
CREATE TABLE server_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id uuid REFERENCES mcp_servers(id) ON DELETE CASCADE,
  installed_at timestamptz DEFAULT now(),
  status text DEFAULT 'active',
  UNIQUE(user_id, server_id)
);

-- Create Security Scan Results table
CREATE TABLE security_scan_results (
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

-- Create Server Vulnerabilities table
CREATE TABLE server_vulnerabilities (
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

-- Create Server Reputation table
CREATE TABLE server_reputation (
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

-- Create Security Policies table
CREATE TABLE security_policies (
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

-- Enable Row Level Security on all tables
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_policies ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- MCP Servers - Public read, authenticated write
CREATE POLICY "Anyone can read MCP servers"
  ON mcp_servers FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can insert MCP servers"
  ON mcp_servers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update MCP servers"
  ON mcp_servers FOR UPDATE TO authenticated USING (true);

-- User Favorites - Users manage their own
CREATE POLICY "Users can manage their own favorites"
  ON user_favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Server Installations - Users manage their own
CREATE POLICY "Users can manage their own installations"
  ON server_installations FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Security tables - Public read
CREATE POLICY "Anyone can read security scan results"
  ON security_scan_results FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can read vulnerabilities"
  ON server_vulnerabilities FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can read server reputation"
  ON server_reputation FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can read security policies"
  ON security_policies FOR SELECT TO public USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mcp_servers_category_downloads ON mcp_servers (category, downloads DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_rating_verified ON mcp_servers (rating DESC, verified DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_security_score ON mcp_servers (security_score DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_updated_at ON mcp_servers (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_search_vector ON mcp_servers USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_security_scan_results_server_id ON security_scan_results (server_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_server_vulnerabilities_server_id ON server_vulnerabilities (server_id, severity, status);
CREATE INDEX IF NOT EXISTS idx_server_reputation_server_id ON server_reputation (server_id);

-- Create search vector update function
CREATE OR REPLACE FUNCTION update_mcp_server_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.author, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector updates
CREATE TRIGGER mcp_server_search_vector_update
  BEFORE INSERT OR UPDATE ON mcp_servers
  FOR EACH ROW EXECUTE FUNCTION update_mcp_server_search_vector();

-- Create search function
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
      ELSE COALESCE(ts_rank(s.search_vector, plainto_tsquery('english', search_query)), 0.1)
    END::real as search_rank,
    COALESCE(r.trust_score, 50) as trust_score
  FROM mcp_servers s
  LEFT JOIN server_reputation r ON s.id = r.server_id
  WHERE 
    (search_query = '' OR 
     s.search_vector @@ plainto_tsquery('english', search_query) OR
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

-- Create increment downloads function
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

-- Create reputation calculation function
CREATE OR REPLACE FUNCTION calculate_server_reputation(server_uuid uuid)
RETURNS integer AS $$
DECLARE
  base_score integer := 50;
  final_score integer;
  server_data record;
  vuln_penalty integer := 0;
  trust_bonus integer := 0;
BEGIN
  -- Get server data
  SELECT * INTO server_data FROM mcp_servers WHERE id = server_uuid;
  
  IF NOT FOUND THEN
    RETURN 50;
  END IF;
  
  -- Calculate vulnerability penalty
  SELECT COALESCE(COUNT(*) * 10, 0) INTO vuln_penalty
  FROM server_vulnerabilities 
  WHERE server_id = server_uuid AND status = 'open' AND severity IN ('critical', 'high');
  
  -- Calculate trust bonus
  IF server_data.verified THEN
    trust_bonus := trust_bonus + 20;
  END IF;
  
  IF server_data.security_score >= 95 THEN
    trust_bonus := trust_bonus + 15;
  ELSIF server_data.security_score >= 90 THEN
    trust_bonus := trust_bonus + 10;
  END IF;
  
  IF server_data.downloads > 10000 THEN
    trust_bonus := trust_bonus + 10;
  ELSIF server_data.downloads > 1000 THEN
    trust_bonus := trust_bonus + 5;
  END IF;
  
  -- Calculate final score
  final_score := base_score + trust_bonus - vuln_penalty;
  final_score := GREATEST(0, LEAST(100, final_score));
  
  -- Update reputation table
  INSERT INTO server_reputation (server_id, trust_score, reputation_factors, last_calculated)
  VALUES (server_uuid, final_score, jsonb_build_object(
    'base_score', base_score,
    'trust_bonus', trust_bonus,
    'vuln_penalty', vuln_penalty,
    'verified', server_data.verified,
    'security_score', server_data.security_score,
    'downloads', server_data.downloads
  ), now())
  ON CONFLICT (server_id) 
  DO UPDATE SET 
    trust_score = final_score,
    reputation_factors = jsonb_build_object(
      'base_score', base_score,
      'trust_bonus', trust_bonus,
      'vuln_penalty', vuln_penalty,
      'verified', server_data.verified,
      'security_score', server_data.security_score,
      'downloads', server_data.downloads
    ),
    last_calculated = now();
    
  RETURN final_score;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION search_mcp_servers TO authenticated;
GRANT EXECUTE ON FUNCTION search_mcp_servers TO anon;
GRANT EXECUTE ON FUNCTION increment_downloads TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_server_reputation TO authenticated;

-- Insert sample data if mcp_servers is empty
INSERT INTO mcp_servers (name, description, category, security_score, downloads, rating, compatibility, author, verified, tags, install_command, github_url) 
SELECT * FROM (VALUES
  ('slack-connector', 'Secure Slack workspace integration with advanced message handling and channel management', 'Communication', 98, 45230, 4.8, ARRAY['claude-3', 'gpt-4', 'gemini-pro'], 'SlackTeam', true, ARRAY['messaging', 'collaboration', 'real-time'], 'npm install @mcphub/slack-connector', 'https://github.com/mcphub/slack-connector'),
  ('github-integration', 'Complete GitHub API wrapper with repository management, PR automation, and code analysis', 'Development', 95, 38920, 4.9, ARRAY['claude-3', 'gpt-4'], 'GitHubInc', true, ARRAY['git', 'code', 'automation'], 'npm install @mcphub/github-integration', 'https://github.com/mcphub/github-integration'),
  ('postgres-client', 'High-performance PostgreSQL connector with query optimization and transaction management', 'Database', 92, 29105, 4.7, ARRAY['claude-3', 'gpt-4', 'gemini-pro'], 'PostgreSQL', true, ARRAY['database', 'sql', 'performance'], 'npm install @mcphub/postgres-client', 'https://github.com/mcphub/postgres-client'),
  ('notion-sync', 'Bidirectional Notion workspace synchronization with real-time updates and conflict resolution', 'Productivity', 89, 22840, 4.6, ARRAY['claude-3', 'gemini-pro'], 'NotionHQ', false, ARRAY['productivity', 'sync', 'collaboration'], 'npm install @mcphub/notion-sync', 'https://github.com/mcphub/notion-sync'),
  ('stripe-payments', 'Comprehensive Stripe integration for payment processing with subscription management', 'Finance', 96, 18560, 4.8, ARRAY['claude-3', 'gpt-4'], 'StripeInc', true, ARRAY['payments', 'subscription', 'ecommerce'], 'npm install @mcphub/stripe-payments', 'https://github.com/mcphub/stripe-payments'),
  ('openai-assistant', 'Advanced OpenAI GPT integration with function calling and conversation management', 'AI/ML', 94, 67890, 4.9, ARRAY['claude-3', 'gpt-4'], 'OpenAI', true, ARRAY['ai', 'gpt', 'assistant'], 'npm install @mcphub/openai-assistant', 'https://github.com/mcphub/openai-assistant'),
  ('discord-bot', 'Full-featured Discord bot framework with slash commands and event handling', 'Communication', 91, 34567, 4.5, ARRAY['claude-3', 'gpt-4'], 'DiscordJS', true, ARRAY['discord', 'bot', 'gaming'], 'npm install @mcphub/discord-bot', 'https://github.com/mcphub/discord-bot'),
  ('mongodb-client', 'Modern MongoDB connector with aggregation pipeline support and schema validation', 'Database', 88, 25432, 4.4, ARRAY['claude-3', 'gemini-pro'], 'MongoDB', false, ARRAY['database', 'nosql', 'mongodb'], 'npm install @mcphub/mongodb-client', 'https://github.com/mcphub/mongodb-client')
) AS v(name, description, category, security_score, downloads, rating, compatibility, author, verified, tags, install_command, github_url)
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers LIMIT 1);

-- Insert default security policies
INSERT INTO security_policies (name, description, policy_type, severity_threshold, auto_action) 
VALUES
  ('Critical Vulnerability Policy', 'Automatically flag servers with critical vulnerabilities', 'vulnerability', 'critical', 'flag'),
  ('High Risk Dependency Policy', 'Monitor servers with high-risk dependencies', 'dependency', 'high', 'flag'),
  ('License Compliance Policy', 'Ensure license compatibility', 'license', 'medium', 'flag'),
  ('Malware Detection Policy', 'Detect and quarantine malicious code', 'vulnerability', 'critical', 'quarantine')
ON CONFLICT DO NOTHING;

-- Update search vectors for existing records
UPDATE mcp_servers SET updated_at = now();

-- Initialize reputation scores for all servers
DO $$
DECLARE
  server_record record;
BEGIN
  FOR server_record IN SELECT id FROM mcp_servers LOOP
    PERFORM calculate_server_reputation(server_record.id);
  END LOOP;
END $$;

-- Add sample security scan data
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
ON CONFLICT DO NOTHING;

-- Force schema reload
NOTIFY pgrst, 'reload schema';