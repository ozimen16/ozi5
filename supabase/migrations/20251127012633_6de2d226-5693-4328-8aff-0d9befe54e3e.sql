-- Add username_changes counter to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username_changes INTEGER DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.username_changes IS 'Number of times user has changed their username. First change is free, subsequent changes cost 20 TL.';