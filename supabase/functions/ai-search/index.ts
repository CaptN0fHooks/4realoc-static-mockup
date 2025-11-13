// supabase/functions/ai-search/index.ts
// Real OC - AI Property Search (v1, DB-backed)
// - Handles CORS
// - Reads from public.listings
// - Returns clean, front-end-ready JSON

import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ---- Supabase backend client (service role) ----

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function env.",
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ---- Helpers ----

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

// Simple query normalizer (Phase 1: just log, no AI yet)
function normalizeQuery(raw: string): string {
  if (!raw) return "";
  return raw.trim();
}

// ---- Main handler ----

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req
      .json()
      .catch(() => ({}) as { query?: string; filters?: Record<string, unknown> });

    const rawQuery = typeof body.query === "string" ? body.query : "";
    const filters = (body.filters ?? {}) as Record<string, unknown>;

    const query = normalizeQuery(rawQuery);

    console.log("ai-search request:", { query, filters });

    if (!supabaseUrl || !supabaseServiceKey) {
      // Config issue, not caller's fault
      return jsonResponse(
        { error: "Server configuration error. Supabase env not set." },
        500,
      );
    }

    // ---- Base DB query ----
    // Phase 1: very simple – just return active listings, newest first.
    // We can layer in AI + more complex filters later.

    let dbQuery = supabase
      .from("listings")
      .select(
        `
        id,
        address,
        city,
        state,
        postal_code,
        neighborhood,
        price,
        beds,
        baths,
        sqft,
        main_image_url,
        highlight,
        latitude,
        longitude,
        status,
        is_active,
        created_at
      `,
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(30);

    // ---- Apply basic filters, if provided ----
    const {
      beds,
      baths,
      minPrice,
      maxPrice,
      city,
    } = filters as {
      beds?: number | string;
      baths?: number | string;
      minPrice?: number | string;
      maxPrice?: number | string;
      city?: string;
    };

    // helper to coerce possibly-string numbers
    const toNum = (value: number | string | undefined) => {
      if (value === undefined || value === null) return undefined;
      const n = typeof value === "number" ? value : Number(value);
      return Number.isFinite(n) ? n : undefined;
    };

    const minBeds = toNum(beds);
    const minBaths = toNum(baths);
    const priceMin = toNum(minPrice);
    const priceMax = toNum(maxPrice);
    const cityFilter = typeof city === "string" ? city.trim() : "";

    if (minBeds !== undefined) {
      dbQuery = dbQuery.gte("beds", minBeds);
    }

    if (minBaths !== undefined) {
      dbQuery = dbQuery.gte("baths", minBaths);
    }

    if (priceMin !== undefined) {
      dbQuery = dbQuery.gte("price", priceMin);
    }

    if (priceMax !== undefined) {
      dbQuery = dbQuery.lte("price", priceMax);
    }

    if (cityFilter) {
      dbQuery = dbQuery.ilike("city", `%${cityFilter}%`);
    }

    // Later we can add:
    // - Price filters
    // - Beds/baths filters
    // - City / neighborhood filters
    // - Text search based on "query"
    // For now, we just ignore filters + query and return a sane default.

    const { data, error } = await dbQuery;

    if (error) {
      console.error("Supabase listings query error:", error);
      return jsonResponse({ error: "Failed to fetch listings." }, 500);
    }

    const safeData = Array.isArray(data) ? data : [];

    // Map DB rows → front-end-friendly objects
    const results = safeData.map((row) => ({
      id: row.id,
      address: row.address,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      neighborhood: row.neighborhood,
      price: row.price ?? null,
      beds: row.beds ?? null,
      baths: row.baths ?? null,
      sqft: row.sqft ?? null,
      lat: row.latitude ?? null,
      lng: row.longitude ?? null,
      image: row.main_image_url ||
        "https://via.placeholder.com/600x400?text=Property",
      url: "#",
      highlights: row.highlight ? [row.highlight] : [],
      status: row.status ?? "active",
      createdAt: row.created_at,
    }));

    return jsonResponse({ results }, 200);
  } catch (err) {
    console.error("ai-search unexpected error:", err);

    return jsonResponse(
      {
        error: "Internal error in ai-search function.",
      },
      500,
    );
  }
});
