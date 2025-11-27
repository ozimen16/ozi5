-- Drop the foreign key constraints from followers table
ALTER TABLE public.followers DROP CONSTRAINT IF EXISTS followers_follower_id_fkey;
ALTER TABLE public.followers DROP CONSTRAINT IF EXISTS followers_following_id_fkey;

-- The table structure is fine, just removing the foreign keys to auth.users
-- RLS policies will still work correctly with auth.uid()