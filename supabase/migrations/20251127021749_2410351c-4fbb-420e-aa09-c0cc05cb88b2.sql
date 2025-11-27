-- Function to update seller score based on reviews average
CREATE OR REPLACE FUNCTION public.update_seller_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating NUMERIC;
BEGIN
  -- Calculate average rating for the reviewed user
  SELECT COALESCE(AVG(rating), 0.00)
  INTO avg_rating
  FROM public.reviews
  WHERE reviewed_user_id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id);
  
  -- Update the seller's score in profiles
  UPDATE public.profiles
  SET seller_score = ROUND(avg_rating, 2)
  WHERE user_id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update seller score when review is inserted, updated, or deleted
DROP TRIGGER IF EXISTS update_seller_score_trigger ON public.reviews;
CREATE TRIGGER update_seller_score_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_seller_score();

-- Update all existing seller scores based on current reviews
UPDATE public.profiles p
SET seller_score = COALESCE(
  (SELECT ROUND(AVG(rating), 2)
   FROM public.reviews r
   WHERE r.reviewed_user_id = p.user_id),
  0.00
);