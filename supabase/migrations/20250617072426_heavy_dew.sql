/*
  # Fix search_mcp_servers function to match actual table schema

  The previous function was trying to return columns that don't exist.
  This migration drops and recreates the function with the correct schema.
*/

-- Drop the incorrect function
DROP FUNCTION IF EXISTS search_mcp_servers(TEXT, TEXT, INTEGER, BOOLEAN);

-- Create the corrected function that matches the actual mcp_servers table schema
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
  security_score INTEGER,
  downloads INTEGER,
  rating DECIMAL,
  compatibility TEXT[],
  last_updated TIMESTAMPTZ,
  author TEXT,
  verified BOOLEAN,
  tags TEXT[],
  install_command TEXT,
  github_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  search_rank REAL,
  trust_score INTEGER
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
    END::REAL as search_rank,
    COALESCE(r.trust_score, 50) as trust_score
  FROM mcp_servers s
  LEFT JOIN server_reputation r ON s.id = r.server_id
  WHERE 
    -- Text search across name, description, author, and tags
    (
      search_query = '' OR
      s.name ILIKE '%' || search_query || '%' OR
      s.description ILIKE '%' || search_query || '%' OR
      s.author ILIKE '%' || search_query || '%' OR
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
    AND (NOT verified_only OR s.verified = true)
  ORDER BY 
    search_rank DESC,
    s.downloads DESC,
    s.rating DESC
  LIMIT 50;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION search_mcp_servers TO anon, authenticated;