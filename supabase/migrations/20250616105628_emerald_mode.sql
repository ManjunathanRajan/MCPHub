/*
  # Fix search_mcp_servers function parameter handling

  1. Database Functions
    - Update `search_mcp_servers` RPC function to accept single JSONB parameter
    - Extract individual parameters from JSONB object
    - Maintain all existing functionality with proper parameter handling

  2. Security
    - Keep SECURITY DEFINER to bypass RLS for internal queries
    - Maintain existing RLS policies
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS search_mcp_servers(text, integer, integer, text, boolean);

-- Create the updated search_mcp_servers RPC function with JSONB parameter
CREATE OR REPLACE FUNCTION search_mcp_servers(params jsonb DEFAULT '{}')
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
  rating numeric,
  compatibility text[],
  last_updated timestamptz,
  install_command text,
  github_url text,
  verified boolean,
  search_rank real,
  trust_score numeric,
  reputation_factors jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  category_filter text := COALESCE(params->>'category_filter', 'all');
  limit_count integer := COALESCE((params->>'limit_count')::integer, 50);
  min_security_score integer := COALESCE((params->>'min_security_score')::integer, 0);
  search_query text := COALESCE(params->>'search_query', '');
  verified_only boolean := COALESCE((params->>'verified_only')::boolean, false);
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
    COALESCE(s.rating, 0::numeric) as rating,
    COALESCE(s.compatibility, ARRAY[]::text[]) as compatibility,
    COALESCE(s.last_updated, s.updated_at) as last_updated,
    COALESCE(s.install_command, '') as install_command,
    COALESCE(s.github_url, s.repository_url) as github_url,
    s.is_verified as verified,
    CASE 
      WHEN search_query = '' THEN 0::real
      ELSE ts_rank(
        to_tsvector('english', s.name || ' ' || s.description || ' ' || s.author),
        plainto_tsquery('english', search_query)
      )
    END as search_rank,
    COALESCE(r.trust_score, 0::numeric) as trust_score,
    COALESCE(r.reputation_factors, '{}'::jsonb) as reputation_factors
  FROM mcp_servers s
  LEFT JOIN server_reputation r ON s.id = r.server_id
  WHERE 
    (search_query = '' OR 
     to_tsvector('english', s.name || ' ' || s.description || ' ' || s.author) @@ plainto_tsquery('english', search_query) OR
     s.name ILIKE '%' || search_query || '%' OR 
     s.description ILIKE '%' || search_query || '%' OR 
     s.author ILIKE '%' || search_query || '%')
    AND (category_filter = 'all' OR s.category = category_filter)
    AND s.security_score >= min_security_score
    AND (NOT verified_only OR s.is_verified = true)
  ORDER BY 
    CASE WHEN search_query = '' THEN 0 ELSE 1 END,
    search_rank DESC,
    s.downloads DESC, 
    s.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION search_mcp_servers TO authenticated;
GRANT EXECUTE ON FUNCTION search_mcp_servers TO anon;