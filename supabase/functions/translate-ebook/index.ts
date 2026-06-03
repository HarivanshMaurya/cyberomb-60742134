import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Free Google Translate API (unofficial, no API key needed).
 */
async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return text;

  const url = "https://translate.googleapis.com/translate_a/single";
  const params = new URLSearchParams({
    client: "gtx",
    sl: "auto",
    tl: targetLang,
    dt: "t",
    q: text,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Translate error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  if (!data || !Array.isArray(data[0])) {
    throw new Error("Unexpected Google Translate response format");
  }

  return data[0].map((seg: any) => seg[0] || "").join("");
}

/**
 * Extract all text nodes from HTML, translate them individually, and reinsert.
 * This guarantees HTML structure is never broken.
 */
async function translateHtml(html: string, targetLang: string): Promise<string> {
  // Use a simple regex to find text nodes between tags
  // Split into: [text, tag, text, tag, ...]
  const parts = html.split(/(<[^>]*>)/g);

  // Collect pure text parts (not tags, not empty)
  const textIndices: number[] = [];
  const textBatch: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (!parts[i].startsWith("<") && parts[i].trim().length > 0) {
      textIndices.push(i);
      textBatch.push(parts[i]);
    }
  }

  if (textBatch.length === 0) return html;

  // Use a numeric-only separator that Google Translate won't touch
  // Format: ||N|| where N is the index
  // Batch all text into chunks of ~3000 chars using this separator
  const BATCH_MAX = 3000;
  const batches: { indices: number[]; texts: string[] }[] = [];
  let currentBatch: { indices: number[]; texts: string[] } = { indices: [], texts: [] };
  let currentLen = 0;

  for (let i = 0; i < textBatch.length; i++) {
    const sepOverhead = 8; // "||N||" approx
    if (currentLen + textBatch[i].length + sepOverhead > BATCH_MAX && currentBatch.texts.length > 0) {
      batches.push(currentBatch);
      currentBatch = { indices: [], texts: [] };
      currentLen = 0;
    }
    currentBatch.indices.push(textIndices[i]);
    currentBatch.texts.push(textBatch[i]);
    currentLen += textBatch[i].length + sepOverhead;
  }
  if (currentBatch.texts.length > 0) batches.push(currentBatch);

  // Translate each batch
  for (let b = 0; b < batches.length; b++) {
    if (b > 0) await new Promise((r) => setTimeout(r, 400));
    const batch = batches[b];

    if (batch.texts.length === 1) {
      // Single text — translate directly, no separator needed
      let translated = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          translated = await translateText(batch.texts[0], targetLang);
          break;
        } catch (err) {
          if (attempt === 2) throw err;
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
      parts[batch.indices[0]] = translated;
    } else {
      // Use numeric markers as separator — these survive translation unchanged
      // Format: TEXT0||0||TEXT1||1||TEXT2
      // We join with unique numeric markers, translate, then split by same markers
      const joined = batch.texts.map((t, i) => (i === 0 ? t : `||${i}||${t}`)).join("");
      // The markers ||0||, ||1|| etc. are pure numbers/pipes — won't be translated

      let translatedJoined = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          translatedJoined = await translateText(joined, targetLang);
          break;
        } catch (err) {
          if (attempt === 2) throw err;
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }

      // Split back using the numeric markers
      // Build regex: ||1||, ||2||, etc.
      const segments = [translatedJoined];
      let workStr = translatedJoined;
      const splitResult: string[] = [];
      
      // Split sequentially by each marker
      for (let i = 1; i < batch.texts.length; i++) {
        // Find marker ||i|| with optional surrounding spaces
        const markerRegex = new RegExp(`\\s*\\|\\|\\s*${i}\\s*\\|\\|\\s*`);
        const markerIdx = workStr.search(markerRegex);
        if (markerIdx === -1) {
          // Marker not found — translate this piece individually as fallback
          splitResult.push(workStr);
          workStr = "";
          // For remaining, push original text
          for (let j = splitResult.length; j < batch.texts.length; j++) {
            splitResult.push(batch.texts[j]);
          }
          break;
        }
        const match = workStr.match(markerRegex)!;
        const before = workStr.slice(0, markerIdx);
        splitResult.push(before);
        workStr = workStr.slice(markerIdx + match[0].length);
      }
      if (splitResult.length < batch.texts.length) {
        splitResult.push(workStr);
      }

      // Reinsert translated texts
      for (let i = 0; i < batch.indices.length; i++) {
        if (i < splitResult.length && splitResult[i] !== undefined) {
          parts[batch.indices[i]] = splitResult[i] || batch.texts[i];
        }
      }
    }
  }

  return parts.join("");
}

/**
 * Translate plain text title in chunks if needed.
 */
async function translateTitle(title: string, targetLang: string): Promise<string> {
  if (!title.trim()) return title;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await translateText(title, targetLang);
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return title;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require a valid Supabase JWT (anon-key bearer or signed-in user) to
  // prevent abuse as an unauthenticated translation proxy.
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { chapters, targetLang } = await req.json();

    if (!chapters || !Array.isArray(chapters) || !targetLang) {
      return new Response(
        JSON.stringify({ error: "Missing chapters array or targetLang" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Translating ${chapters.length} chapters to ${targetLang}`);

    const translatedChapters: { title: string; content: string }[] = [];

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      console.log(`Translating chapter ${i + 1}/${chapters.length}: "${ch.title}"`);

      // Translate title
      const translatedTitle = await translateTitle(ch.title || "", targetLang);

      // Small delay between title and content
      await new Promise((r) => setTimeout(r, 150));

      // Translate HTML content
      const translatedContent = await translateHtml(ch.content || "", targetLang);

      translatedChapters.push({
        title: translatedTitle,
        content: translatedContent,
      });

      // Delay between chapters to avoid rate limiting
      if (i < chapters.length - 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    console.log(`Translation complete! ${translatedChapters.length} chapters done.`);

    return new Response(
      JSON.stringify({ chapters: translatedChapters }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translate ebook error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
