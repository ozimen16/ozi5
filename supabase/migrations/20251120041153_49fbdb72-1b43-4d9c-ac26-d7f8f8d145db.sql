-- Create storage bucket for listing images
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true);

-- Create RLS policies for listing images
CREATE POLICY "Anyone can view listing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-images');

CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'listing-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own listing images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'listing-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own listing images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'listing-images' 
  AND auth.role() = 'authenticated'
);

-- Add admin role for admin@mail.com user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@mail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create profile for the admin user if it doesn't exist
INSERT INTO public.profiles (user_id, username, balance, seller_score, total_sales)
SELECT 
  id,
  COALESCE(email, id::text),
  0,
  0,
  0
FROM auth.users
WHERE email = 'admin@mail.com'
ON CONFLICT (user_id) DO NOTHING;