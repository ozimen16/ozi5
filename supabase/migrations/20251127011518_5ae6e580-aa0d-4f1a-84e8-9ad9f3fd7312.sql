-- Drop existing constraint if it exists (just to be safe)
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_user_id_fkey;

-- Add foreign key relationship between listings.user_id and profiles.user_id
ALTER TABLE public.listings 
ADD CONSTRAINT listings_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- Drop existing constraints for orders if they exist
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_seller_id_fkey;

-- Add foreign key relationships for orders
ALTER TABLE public.orders 
ADD CONSTRAINT orders_buyer_id_fkey 
FOREIGN KEY (buyer_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_seller_id_fkey 
FOREIGN KEY (seller_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;