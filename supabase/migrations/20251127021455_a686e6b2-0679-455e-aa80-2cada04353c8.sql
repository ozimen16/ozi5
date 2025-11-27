-- Update rating constraint to allow 1-10 instead of 1-5
ALTER TABLE public.reviews 
DROP CONSTRAINT IF EXISTS reviews_rating_check;

ALTER TABLE public.reviews
ADD CONSTRAINT reviews_rating_check 
CHECK (rating >= 1 AND rating <= 10);