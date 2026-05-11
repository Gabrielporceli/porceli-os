import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientData = await req.json();
    console.log("send-client-webhook: dados recebidos", clientData?.company);

    // Chama asaas-new-client internamente (substitui webhook n8n)
    const response = await fetch(`${SUPABASE_URL}/functions/v1/asaas-new-client`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ ...clientData, timestamp: new Date().toISOString(), event: "client_created" }),
    });

    const result = await response.json();
    console.log("asaas-new-client response:", response.status, result?.success);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: result?.error ?? "asaas-new-client failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const e = err as Error;
    console.error("send-client-webhook error:", e.message);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
