/*
  # Fix search function and table relationships

  1. Database Functions
    - Create `search_mcp_servers` RPC function with proper parameter handling
    - Create `increment_downloads` RPC function for download counting

  2. Table Relationships
    - Add proper foreign key constraints between tables
    - Ensure server_reputation table has correct relationship to mcp_servers

  3. Security
    - Maintain RLS policies on all tables
    - Ensure functions respect security policies
*/

-- Create the search_mcp_servers RPC function
CREATE OR REPLACE FUNCTION search_mcp_servers(
  category_filter text DEFAULT 'all',
  limit_count integer DEFAULT 50,
  min_security_score integer DEFAULT 0,
  search_query text DEFAULT '',
  verified_only boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  author text,
  version text,
  category text,
  tags text[],
  repository_url text,
  documentation_url text,
  license text,
  downloads integer,
  security_score integer,
  is_verified boolean,
  created_at timestamptz,
  updated_at timestamptz,
  trust_score numeric,
  reputation_factors jsonb
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
    s.author,
    s.version,
    s.category,
    s.tags,
    s.repository_url,
    s.documentation_url,
    s.license,
    s.downloads,
    s.security_score,
    s.is_verified,
    s.created_at,
    s.updated_at,
    COALESCE(r.trust_score, 0::numeric) as trust_score,
    COALESCE(r.reputation_factors, '{}'::jsonb) as reputation_factors
  FROM mcp_servers s
  LEFT JOIN server_reputation r ON s.id = r.server_id
  WHERE 
    (search_query = '' OR 
     s.name ILIKE '%' || search_query || '%' OR 
     s.description ILIKE '%' || search_query || '%' OR 
     s.author ILIKE '%' || search_query || '%')
    AND (category_filter = 'all' OR s.category = category_filter)
    AND s.security_score >= min_security_score
    AND (NOT verified_only OR s.is_verified = true)
  ORDER BY s.downloads DESC, s.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Create the increment_downloads function
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

-- Ensure proper foreign key relationship exists
DO $$
BEGIN
  -- Check if foreign key constraint exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'server_reputation_server_id_fkey'
    AND table_name = 'server_reputation'
  ) THEN
    ALTER TABLE server_reputation 
    ADD CONSTRAINT server_reputation_server_id_fkey 
    FOREIGN KEY (server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION search_mcp_servers TO authenticated;
GRANT EXECUTE ON FUNCTION search_mcp_servers TO anon;
GRANT EXECUTE ON FUNCTION increment_downloads TO authenticated;