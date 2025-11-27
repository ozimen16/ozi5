-- Add image_url column to categories table
ALTER TABLE public.categories 
ADD COLUMN image_url TEXT;