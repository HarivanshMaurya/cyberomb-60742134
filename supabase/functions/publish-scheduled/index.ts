import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // AuthZ: accept either a CRON_SECRET header (for scheduled invocations)
    // or an admin user's JWT (for manual triggers from the admin panel).
    const authHeader = req.headers.get("authorization") ?? "";
    const cronSecretHeader = req.headers.get("x-cron-secret") ?? "";
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";

    let authorized = false;
    if (cronSecret && cronSecretHeader && cronSecretHeader === cronSecret) {
      authorized = true;
    } else if (authHeader.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: roleRow } = await userClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleRow) authorized = true;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    // Update articles where status is 'scheduled' and published_at <= now
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .update({ status: "published" })
      .eq("status", "scheduled")
      .lte("published_at", now)
      .select("id, title");

    if (articlesError) {
      console.error("Error publishing articles:", articlesError);
    }

    // Update wellness_articles where status is 'scheduled' and published_at <= now
    const { data: wellnessArticles, error: wellnessError } = await supabase
      .from("wellness_articles")
      .update({ status: "published" })
      .eq("status", "scheduled")
      .lte("published_at", now)
      .select("id, title");

    if (wellnessError) {
      console.error("Error publishing wellness articles:", wellnessError);
    }

    const publishedCount =
      (articles?.length || 0) + (wellnessArticles?.length || 0);

    console.log(
      `Published ${publishedCount} scheduled articles`,
      { articles, wellnessArticles }
    );

    return new Response(
      JSON.stringify({
        success: true,
        published: publishedCount,
        articles: articles || [],
        wellnessArticles: wellnessArticles || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cron error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
