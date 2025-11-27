-- Add unique constraint so users can only review once per order
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_order_reviewer_unique 
UNIQUE (order_id, reviewer_id);