import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GpsPing {
  id: string;
  ts: string;
  lat: number;
  lon: number;
  tractor_id: string;
  tenant_id: string;
}

interface Block {
  id: string;
  geometry_geojson: any;
  tenant_id: string;
}

// Simple point-in-polygon check using ray casting algorithm
function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

function getPolygonCoordinates(geojson: any): number[][] | null {
  try {
    if (geojson.type === 'Polygon') {
      return geojson.coordinates[0];
    }
    if (geojson.type === 'Feature' && geojson.geometry?.type === 'Polygon') {
      return geojson.geometry.coordinates[0];
    }
    return null;
  } catch {
    return null;
  }
}

// Gap threshold for merging visits (in minutes)
// If a tractor leaves and re-enters within this time, it's considered the same visit
const MERGE_GAP_MINUTES = 30;

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { block_id, tractor_id, tenant_id: providedTenantId } = body;

    // Get tenant_id from auth or from provided value
    let tenantId = providedTenantId;
    
    if (!tenantId) {
      // Try to get from authorization header
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabase.auth.getUser(token);
        if (userData?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("tenant_id")
            .eq("user_id", userData.user.id)
            .single();
          tenantId = profile?.tenant_id;
        }
      }
    }

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing historical visits for tenant: ${tenantId}`);

    // Fetch blocks (either specific one or all for tenant)
    let blocksQuery = supabase
      .from("blocks")
      .select("id, geometry_geojson, tenant_id")
      .eq("tenant_id", tenantId);
    
    if (block_id) {
      blocksQuery = blocksQuery.eq("id", block_id);
    }

    const { data: blocks, error: blocksError } = await blocksQuery;
    
    if (blocksError) {
      throw new Error(`Error fetching blocks: ${blocksError.message}`);
    }

    if (!blocks || blocks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No blocks found", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${blocks.length} blocks to process`);

    // Fetch GPS pings, optionally filtered by tractor
    let pingsQuery = supabase
      .from("gps_pings")
      .select("id, ts, lat, lon, tractor_id, tenant_id")
      .eq("tenant_id", tenantId)
      .order("ts", { ascending: true });
    
    if (tractor_id) {
      pingsQuery = pingsQuery.eq("tractor_id", tractor_id);
    }

    // Paginate through all pings (Supabase default limit is 1000)
    const allPings: GpsPing[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: pings, error: pingsError } = await pingsQuery
        .range(offset, offset + pageSize - 1);

      if (pingsError) {
        throw new Error(`Error fetching pings: ${pingsError.message}`);
      }

      if (!pings || pings.length === 0) {
        hasMore = false;
      } else {
        allPings.push(...pings);
        offset += pageSize;
        hasMore = pings.length === pageSize;
      }
    }

    console.log(`Found ${allPings.length} GPS pings to process`);

    if (allPings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No GPS pings found", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group pings by tractor
    const pingsByTractor = new Map<string, GpsPing[]>();
    for (const ping of allPings) {
      if (!pingsByTractor.has(ping.tractor_id)) {
        pingsByTractor.set(ping.tractor_id, []);
      }
      pingsByTractor.get(ping.tractor_id)!.push(ping);
    }

    // Process visits for each block
    const results = {
      visitsCreated: 0,
      metricsUpdated: 0,
      errors: [] as string[],
    };

    for (const block of blocks) {
      const polygon = getPolygonCoordinates(block.geometry_geojson);
      if (!polygon) {
        results.errors.push(`Block ${block.id}: Invalid geometry`);
        continue;
      }

      // Track visits per tractor for this block
      const blockVisits: Array<{
        tractor_id: string;
        started_at: string;
        ended_at: string | null;
        ping_count: number;
      }> = [];

      for (const [tractorId, pings] of pingsByTractor) {
        // Step 1: Detect raw visits (each entry/exit creates one)
        const rawVisits: Array<{
          started_at: string;
          ended_at: string;
          ping_count: number;
        }> = [];
        
        let currentVisit: { started_at: string; pings: GpsPing[] } | null = null;

        for (const ping of pings) {
          const isInside = isPointInPolygon([ping.lon, ping.lat], polygon);

          if (isInside) {
            if (!currentVisit) {
              // Start new visit
              currentVisit = { started_at: ping.ts, pings: [ping] };
            } else {
              // Continue visit
              currentVisit.pings.push(ping);
            }
          } else if (currentVisit) {
            // End visit
            const lastPing = currentVisit.pings[currentVisit.pings.length - 1];
            rawVisits.push({
              started_at: currentVisit.started_at,
              ended_at: lastPing.ts,
              ping_count: currentVisit.pings.length,
            });
            currentVisit = null;
          }
        }

        // Handle ongoing visit (tractor still in block at end of data)
        if (currentVisit && currentVisit.pings.length > 0) {
          const lastPing = currentVisit.pings[currentVisit.pings.length - 1];
          rawVisits.push({
            started_at: currentVisit.started_at,
            ended_at: lastPing.ts,
            ping_count: currentVisit.pings.length,
          });
        }

        // Step 2: Merge visits that are close together (gap < MERGE_GAP_MINUTES)
        let currentMergedVisit: {
          started_at: string;
          ended_at: string;
          ping_count: number;
        } | null = null;

        for (const visit of rawVisits) {
          if (!currentMergedVisit) {
            currentMergedVisit = { ...visit };
          } else {
            const gapMs = new Date(visit.started_at).getTime() 
                        - new Date(currentMergedVisit.ended_at).getTime();
            const gapMinutes = gapMs / (1000 * 60);

            if (gapMinutes < MERGE_GAP_MINUTES) {
              // Merge: extend the current visit
              currentMergedVisit.ended_at = visit.ended_at;
              currentMergedVisit.ping_count += visit.ping_count;
            } else {
              // Gap >= 30 min: save the previous and start a new one
              blockVisits.push({
                tractor_id: tractorId,
                ...currentMergedVisit,
              });
              currentMergedVisit = { ...visit };
            }
          }
        }

        // Don't forget the last merged visit
        if (currentMergedVisit) {
          blockVisits.push({
            tractor_id: tractorId,
            ...currentMergedVisit,
          });
        }
      }

      console.log(`Block ${block.id}: Found ${blockVisits.length} visits`);

      // Delete existing visits for this block (to avoid duplicates)
      const deleteQuery: any = { block_id: block.id };
      if (tractor_id) {
        deleteQuery.tractor_id = tractor_id;
      }

      const { error: deleteError } = await supabase
        .from("block_visits")
        .delete()
        .match(deleteQuery);

      if (deleteError) {
        results.errors.push(`Block ${block.id}: Error deleting old visits: ${deleteError.message}`);
      }

      // Insert new visits
      if (blockVisits.length > 0) {
        const visitsToInsert = blockVisits.map((v) => ({
          block_id: block.id,
          tenant_id: tenantId,
          tractor_id: v.tractor_id,
          started_at: v.started_at,
          ended_at: v.ended_at,
          ping_count: v.ping_count,
        }));

        // Insert in batches of 100
        for (let i = 0; i < visitsToInsert.length; i += 100) {
          const batch = visitsToInsert.slice(i, i + 100);
          const { error: insertError } = await supabase
            .from("block_visits")
            .insert(batch);

          if (insertError) {
            results.errors.push(`Block ${block.id}: Error inserting visits: ${insertError.message}`);
          } else {
            results.visitsCreated += batch.length;
          }
        }
      }

      // Update block metrics
      const lastVisit = blockVisits.length > 0 
        ? blockVisits.reduce((latest, v) => 
            new Date(v.ended_at || v.started_at) > new Date(latest.ended_at || latest.started_at) ? v : latest
          )
        : null;

      // Calculate 24h and 7d passes
      const now = new Date();
      const h24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const passes24h = blockVisits.filter((v) => new Date(v.started_at) >= h24Ago).length;
      const passes7d = blockVisits.filter((v) => new Date(v.started_at) >= d7Ago).length;

      const metricsUpdate = {
        block_id: block.id,
        last_seen_at: lastVisit ? (lastVisit.ended_at || lastVisit.started_at) : null,
        last_tractor_id: lastVisit?.tractor_id || null,
        total_passes: blockVisits.length,
        passes_24h: passes24h,
        passes_7d: passes7d,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("block_metrics")
        .upsert(metricsUpdate, { onConflict: "block_id" });

      if (upsertError) {
        results.errors.push(`Block ${block.id}: Error updating metrics: ${upsertError.message}`);
      } else {
        results.metricsUpdated++;
      }
    }

    console.log(`Processing complete:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing visits:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
