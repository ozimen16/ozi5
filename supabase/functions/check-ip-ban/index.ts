import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get IP address from request
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    console.log('Checking IP ban for:', clientIp);

    // Check if IP is banned
    const { data: banData, error: banError } = await supabaseClient
      .from('ip_bans')
      .select('*')
      .eq('ip_address', clientIp)
      .maybeSingle();

    if (banError) {
      console.error('Error checking IP ban:', banError);
    }

    const isBanned = banData && (!banData.expires_at || new Date(banData.expires_at) > new Date());

    return new Response(
      JSON.stringify({
        ip_address: clientIp,
        is_banned: !!isBanned,
        ban_reason: isBanned ? banData.reason : null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in check-ip-ban function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'IP kontrolü başarısız',
        is_banned: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
