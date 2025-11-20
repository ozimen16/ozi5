-- Create IP bans table
CREATE TABLE IF NOT EXISTS public.ip_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT,
  banned_by UUID REFERENCES auth.users(id),
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ip_bans ENABLE ROW LEVEL SECURITY;

-- Admin can manage IP bans
CREATE POLICY "Admins can manage IP bans"
ON public.ip_bans
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_ip_bans_ip_address ON public.ip_bans(ip_address);
CREATE INDEX idx_ip_bans_expires_at ON public.ip_bans(expires_at);

-- Add function to check if IP is banned
CREATE OR REPLACE FUNCTION public.is_ip_banned(check_ip TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.ip_bans
    WHERE ip_address = check_ip
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;