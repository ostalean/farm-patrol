import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GpsPing {
  ts: string;
  lat: number;
  lon: number;
  speed?: number;
}

interface ImportRequest {
  tractor_id: string;
  pings: GpsPing[];
}

interface ImportStats {
  total: number;
  inserted: number;
  duplicates: number;
  errors: number;
  errorDetails: { row: number; reason: string }[];
}

function validatePing(ping: GpsPing, index: number): { valid: boolean; reason?: string } {
  // Validate latitude
  if (typeof ping.lat !== "number" || ping.lat < -90 || ping.lat > 90) {
    return { valid: false, reason: `Fila ${index + 1}: Latitud inválida (${ping.lat})` };
  }

  // Validate longitude
  if (typeof ping.lon !== "number" || ping.lon < -180 || ping.lon > 180) {
    return { valid: false, reason: `Fila ${index + 1}: Longitud inválida (${ping.lon})` };
  }

  // Validate timestamp
  const tsDate = new Date(ping.ts);
  if (isNaN(tsDate.getTime())) {
    return { valid: false, reason: `Fila ${index + 1}: Timestamp inválido (${ping.ts})` };
  }

  // Check if timestamp is not in the future (with 1 hour tolerance)
  const now = new Date();
  now.setHours(now.getHours() + 1);
  if (tsDate > now) {
    return { valid: false, reason: `Fila ${index + 1}: Timestamp futuro (${ping.ts})` };
  }

  return { valid: true };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user authentication
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Get user's tenant_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: "No se encontró el perfil del usuario" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantId = profile.tenant_id;

    // Parse request body
    const body: ImportRequest = await req.json();
    const { tractor_id, pings } = body;

    if (!tractor_id || !pings || !Array.isArray(pings)) {
      return new Response(
        JSON.stringify({ error: "Formato de request inválido. Se requiere tractor_id y pings[]" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit pings per request
    if (pings.length > 10000) {
      return new Response(
        JSON.stringify({ error: "Máximo 10,000 pings por request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify tractor belongs to user's tenant
    const { data: tractor, error: tractorError } = await supabase
      .from("tractors")
      .select("id, tenant_id")
      .eq("id", tractor_id)
      .eq("tenant_id", tenantId)
      .single();

    if (tractorError || !tractor) {
      return new Response(
        JSON.stringify({ error: "Tractor no encontrado o no pertenece a su organización" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize stats
    const stats: ImportStats = {
      total: pings.length,
      inserted: 0,
      duplicates: 0,
      errors: 0,
      errorDetails: [],
    };

    // Validate all pings first
    const validPings: { ts: string; lat: number; lon: number; speed: number | null }[] = [];
    
    for (let i = 0; i < pings.length; i++) {
      const ping = pings[i];
      const validation = validatePing(ping, i);
      
      if (!validation.valid) {
        stats.errors++;
        if (stats.errorDetails.length < 50) { // Limit error details
          stats.errorDetails.push({ row: i + 1, reason: validation.reason! });
        }
        continue;
      }

      validPings.push({
        ts: new Date(ping.ts).toISOString(),
        lat: ping.lat,
        lon: ping.lon,
        speed: typeof ping.speed === "number" ? ping.speed : null,
      });
    }

    // Get existing timestamps to detect duplicates
    const timestamps = validPings.map(p => p.ts);
    const { data: existingPings } = await supabase
      .from("gps_pings")
      .select("ts")
      .eq("tractor_id", tractor_id)
      .in("ts", timestamps);

    const existingTimestamps = new Set(existingPings?.map(p => p.ts) || []);

    // Filter out duplicates
    const newPings = validPings.filter(p => {
      if (existingTimestamps.has(p.ts)) {
        stats.duplicates++;
        return false;
      }
      return true;
    });

    // Insert in batches of 500
    const BATCH_SIZE = 500;
    let latestPing: { ts: string; lat: number; lon: number } | null = null;

    for (let i = 0; i < newPings.length; i += BATCH_SIZE) {
      const batch = newPings.slice(i, i + BATCH_SIZE).map(ping => ({
        tenant_id: tenantId,
        tractor_id: tractor_id,
        ts: ping.ts,
        lat: ping.lat,
        lon: ping.lon,
        speed: ping.speed,
      }));

      const { error: insertError } = await supabase
        .from("gps_pings")
        .insert(batch);

      if (insertError) {
        console.error("Insert error:", insertError);
        stats.errors += batch.length;
        stats.errorDetails.push({ row: i, reason: `Error de inserción: ${insertError.message}` });
      } else {
        stats.inserted += batch.length;
        
        // Track latest ping for tractor update
        for (const ping of batch) {
          if (!latestPing || new Date(ping.ts) > new Date(latestPing.ts)) {
            latestPing = { ts: ping.ts, lat: ping.lat, lon: ping.lon };
          }
        }
      }
    }

    // Update tractor's last position if we inserted any pings
    if (latestPing) {
      await supabase
        .from("tractors")
        .update({
          last_lat: latestPing.lat,
          last_lon: latestPing.lon,
          last_seen_at: latestPing.ts,
        })
        .eq("id", tractor_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        message: `Importación completada: ${stats.inserted} insertados, ${stats.duplicates} duplicados, ${stats.errors} errores`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
