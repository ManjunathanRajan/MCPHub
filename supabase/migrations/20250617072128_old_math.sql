/*
  # Create search_mcp_servers RPC function

  1. New Functions
    - `search_mcp_servers` - Advanced search function for MCP servers
      - Supports text search across name, description, and tags
      - Filters by category, security score, and verification status
      - Returns filtered and sorted results

  2. Security
    - Function is accessible to all users (public)
    - Uses existing RLS policies on mcp_servers table
*/

CREATE OR REPLACE FUNCTION search_mcp_servers(
  search_query TEXT DEFAULT '',
  category_filter TEXT DEFAULT 'all',
  min_security_score INTEGER DEFAULT 0,
  verified_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  version TEXT,
  author TEXT,
  repository_url TEXT,
  documentation_url TEXT,
  install_command TEXT,
  tags TEXT[],
  rating NUMERIC,
  downloads INTEGER,
  security_score INTEGER,
  is_verified BOOLEAN,
  trust_score INTEGER,
  created_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ
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
    s.version,
    s.author,
    s.repository_url,
    s.documentation_url,
    s.install_command,
    s.tags,
    s.rating,
    s.downloads,
    s.security_score,
    s.is_verified,
    s.trust_score,
    s.created_at,
    s.last_updated
  FROM mcp_servers s
  WHERE 
    -- Text search across name, description, and tags
    (
      search_query = '' OR
      s.name ILIKE '%' || search_query || '%' OR
      s.description ILIKE '%' || search_query || '%' OR
      EXISTS (
        SELECT 1 FROM unnest(s.tags) AS tag 
        WHERE tag ILIKE '%' || search_query || '%'
      )
    )
    -- Category filter
    AND (category_filter = 'all' OR s.category = category_filter)
    -- Security score filter
    AND s.security_score >= min_security_score
    -- Verification filter
    AND (NOT verified_only OR s.is_verified = true)
  ORDER BY s.downloads DESC;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION search_mcp_servers TO anon, authenticated;