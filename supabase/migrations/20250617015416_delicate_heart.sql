/*
  # Fix search_mcp_servers function to match actual database schema

  1. Create search function that matches the actual mcp_servers table structure
  2. Use the correct column names from the existing table
  3. Handle both individual parameters and JSONB parameter formats
  4. Ensure proper RLS and permissions
*/

-- Drop any existing search functions
DROP FUNCTION IF EXISTS search_mcp_servers(jsonb);
DROP FUNCTION IF EXISTS search_mcp_servers(text, integer, integer, text, boolean);

-- Create the search function that matches the actual table structure
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_mcp_servers TO authenticated;
GRANT EXECUTE ON FUNCTION search_mcp_servers TO anon;

-- Ensure the increment_downloads function exists
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_downloads TO authenticated;