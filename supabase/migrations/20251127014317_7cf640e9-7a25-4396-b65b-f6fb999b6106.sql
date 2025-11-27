-- Add cover_url and delivery_hours to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS delivery_hours TEXT DEFAULT '12:00 - 00:00';