import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Free Google Translate API (same as ebook translator).
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
 * Translate HTML content preserving tags.
 */
async function translateHtml(html: string, targetLang: string): Promise<string> {
  const parts = html.split(/(<[^>]*>)/g);

  const textIndices: number[] = [];
  const textBatch: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (!parts[i].startsWith("<") && parts[i].trim().length > 0) {
      textIndices.push(i);
      textBatch.push(parts[i]);
    }
  }

  if (textBatch.length === 0) return html;

  const BATCH_MAX = 3000;
  const batches: { indices: number[]; texts: string[] }[] = [];
  let currentBatch: { indices: number[]; texts: string[] } = { indices: [], texts: [] };
  let currentLen = 0;

  for (let i = 0; i < textBatch.length; i++) {
    const sepOverhead = 8;
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

  for (let b = 0; b < batches.length; b++) {
    if (b > 0) await new Promise((r) => setTimeout(r, 400));
    const batch = batches[b];

    if (batch.texts.length === 1) {
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
      const joined = batch.texts.map((t, i) => (i === 0 ? t : `||${i}||${t}`)).join("");

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

      let workStr = translatedJoined;
      const splitResult: string[] = [];

      for (let i = 1; i < batch.texts.length; i++) {
        const markerRegex = new RegExp(`\\s*\\|\\|\\s*${i}\\s*\\|\\|\\s*`);
        const markerIdx = workStr.search(markerRegex);
        if (markerIdx === -1) {
          splitResult.push(workStr);
          workStr = "";
          for (let j = splitResult.length; j < batch.texts.length; j++) {
            splitResult.push(batch.texts[j]);
          }
          break;
        }
        const match = workStr.match(markerRegex)!;
        splitResult.push(workStr.slice(0, markerIdx));
        workStr = workStr.slice(markerIdx + match[0].length);
      }
      if (splitResult.length < batch.texts.length) {
        splitResult.push(workStr);
      }

      for (let i = 0; i < batch.indices.length; i++) {
        if (i < splitResult.length && splitResult[i] !== undefined) {
          parts[batch.indices[i]] = splitResult[i] || batch.texts[i];
        }
      }
    }
  }

  return parts.join("");
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

    const { title, content, excerpt, targetLang } = await req.json();

    if (!content || !targetLang) {
      return new Response(JSON.stringify({ error: "Missing content or targetLang" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Translating article to ${targetLang}, content length: ${content.length}`);

    // Translate title
    let translatedTitle = title || "";
    if (title?.trim()) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          translatedTitle = await translateText(title, targetLang);
          break;
        } catch (err) {
          if (attempt === 2) throw err;
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    await new Promise((r) => setTimeout(r, 200));

    // Translate excerpt
    let translatedExcerpt = excerpt || "";
    if (excerpt?.trim()) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          translatedExcerpt = await translateText(excerpt, targetLang);
          break;
        } catch (err) {
          if (attempt === 2) throw err;
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    await new Promise((r) => setTimeout(r, 200));

    // Translate HTML content
    const translatedContent = await translateHtml(content, targetLang);

    console.log("Article translation complete!");

    return new Response(
      JSON.stringify({
        title: translatedTitle,
        content: translatedContent,
        excerpt: translatedExcerpt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
