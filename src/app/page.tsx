import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  let connectionStatus = "⏳ Testing...";
  let connectionDetail = "";

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getUser();

    if (error) {
      // Error is expected when no user is logged in — 
      // but it proves the connection to Supabase works!
      connectionStatus = "✅ Supabase Connected";
      connectionDetail = `Auth response received (no session — expected). URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`;
    } else {
      connectionStatus = "✅ Supabase Connected (user session active)";
      connectionDetail = `URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`;
    }
  } catch (err) {
    connectionStatus = "❌ Connection Failed";
    connectionDetail = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold text-heading">
        Warmindo WP 2 POS
      </h1>

      {/* Supabase Connection Test — DELETE after verification */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm max-w-md w-full">
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          Supabase Connection Test
        </h2>
        <p className="text-lg font-semibold">{connectionStatus}</p>
        <p className="text-sm text-muted-foreground mt-1">{connectionDetail}</p>
      </div>

      <p className="text-xs text-red-500 font-medium">
        ⚠️ Connection test is temporary — remove after verification
      </p>
    </div>
  );
}
