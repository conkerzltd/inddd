import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { csv } = await req.json();
    const lines = csv.split("\n").map((l: string) => l.trim()).filter((l: string) => l);
    
    // Skip header
    const dataLines = lines.slice(1);
    
    // Track current governorate context from level 0
    const govMap: Record<string, string> = {}; // id -> name
    const markazMap: Record<string, { gov: string; name: string; kind: string }> = {}; // id -> info
    
    const rows: { governorate_ar: string; level2_ar: string; level2_type: string; level3_ar: string | null }[] = [];
    
    // Known garbage patterns to skip
    const isGarbage = (name: string) => {
      return name.length > 40 || 
             name.includes('مطابقة') || 
             name.includes('مراكز') ||
             name.includes('إداريا') ||
             name.includes('لمراكز') ||
             name.includes('تجم') ||
             name.includes('المذكورة') ||
             name.includes('التطبيقات') ||
             name.includes('ملحوظة') ||
             name.includes('بدلا');
    };
    
    for (const line of dataLines) {
      // Parse CSV (simple - no quoted fields with commas expected)
      const parts = line.split(",");
      if (parts.length < 5) continue;
      
      const id = parts[0];
      const parentId = parts[1];
      const level = parseInt(parts[2]);
      const kind = parts[3];
      const nameAr = parts[4];
      const isOfficialGov = parts[7]?.trim();
      
      if (!nameAr || !kind) continue;
      
      // Skip non-official governorates (like الساحل الشمالي region)
      if (level === 0 && kind === "region") continue;
      if (level === 0 && isOfficialGov !== "True") continue;
      
      if (level === 0 && kind === "governorate") {
        govMap[id] = nameAr;
        continue;
      }
      
      if (level === 1) {
        // Extract governorate from parent
        const govName = govMap[parentId];
        if (!govName) continue;
        if (isGarbage(nameAr)) continue;
        
        const typeUpper = kind === "markaz" ? "MARKAZ" : kind === "city" ? "CITY" : "DISTRICT";
        markazMap[id] = { gov: govName, name: nameAr, kind: typeUpper };
        
        rows.push({
          governorate_ar: govName,
          level2_ar: nameAr,
          level2_type: typeUpper,
          level3_ar: null,
        });
        continue;
      }
      
      if (level === 2 && kind === "village") {
        const parentInfo = markazMap[parentId];
        if (!parentInfo) continue;
        if (isGarbage(nameAr)) continue;
        
        rows.push({
          governorate_ar: parentInfo.gov,
          level2_ar: parentInfo.name,
          level2_type: parentInfo.kind,
          level3_ar: nameAr,
        });
      }
    }
    
    // Batch insert (upsert to handle duplicates)
    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from("geo_localities").insert(batch);
      if (error) {
        console.error(`Batch ${i} error:`, error.message);
        // Try one by one for this batch to skip duplicates
        for (const row of batch) {
          const { error: singleErr } = await supabase.from("geo_localities").insert(row);
          if (!singleErr) inserted++;
        }
      } else {
        inserted += batch.length;
      }
    }
    
    // Count distinct governorates
    const { data: govCount } = await supabase
      .from("geo_localities")
      .select("governorate_ar")
      .then(({ data }) => ({
        data: new Set(data?.map(r => r.governorate_ar)).size
      }));
    
    return new Response(JSON.stringify({ 
      success: true, 
      parsed: rows.length, 
      inserted,
      distinct_governorates: govCount 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
