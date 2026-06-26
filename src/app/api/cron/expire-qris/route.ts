import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cron job to expire QRIS orders that have exceeded their 5-minute timeout.
 * This should be scheduled to run every minute.
 * 
 * For Vercel deployment, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-qris",
 *     "schedule": "* * * * *"
 *   }]
 * }
 * 
 * Alternatively, use Supabase Edge Function with pg_cron.
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for additional security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Find all QRIS_PENDING orders that have expired
    const { data: expiredOrders, error: selectError } = await supabase
      .from("orders")
      .select("id, pakasir_trx_id")
      .eq("status", "QRIS_PENDING")
      .lt("qris_expires_at", new Date().toISOString());

    if (selectError) {
      console.error("[Cron] Failed to query expired orders:", selectError);
      return NextResponse.json(
        { error: "Database query failed", details: selectError.message },
        { status: 500 }
      );
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired QRIS orders found",
        expired_count: 0,
      });
    }

    // Update all expired orders to EXPIRED status
    const orderIds = expiredOrders.map((o) => o.id);

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "EXPIRED",
        updated_at: new Date().toISOString(),
      })
      .in("id", orderIds);

    if (updateError) {
      console.error("[Cron] Failed to update expired orders:", updateError);
      return NextResponse.json(
        { error: "Database update failed", details: updateError.message },
        { status: 500 }
      );
    }

    console.log(
      `[Cron] Successfully expired ${expiredOrders.length} QRIS order(s)`
    );

    return NextResponse.json({
      success: true,
      message: `Expired ${expiredOrders.length} QRIS order(s)`,
      expired_count: expiredOrders.length,
      expired_order_ids: orderIds,
    });
  } catch (error: any) {
    console.error("[Cron] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
