-- This SQL command will refresh the schema cache in Supabase
-- Run this in the SQL Editor in your Supabase dashboard

-- Refresh the schema cache by notifying PostgREST
NOTIFY pgrst, 'reload schema';

-- Alternative method: Force a schema reload
SELECT pg_notify('pgrst', 'reload schema');