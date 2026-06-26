import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/pakasir/status/:trx_id
 *
 * Pakasir API Docs: https://pakasir.com/p/docs (Section E)
 *
 * Calls: GET https://app.pakasir.com/api/transactiondetail
 *   ?project={slug}&amount={amount}&order_id={order_id}&api_key={key}
 *
 * Pakasir status values: "completed" | "pending" | "expired"
 *
 * Note: trx_id here is the order_id we sent to Pakasir (pakasir_trx_id column in DB).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trx_id: string }> }
) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { trx_id } = await params;

    if (!trx_id) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    // 2. Fetch the order from DB to get the amount (required by Pakasir status API)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, total_amount, pakasir_trx_id")
      .eq("pakasir_trx_id", trx_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found for this transaction ID" },
        { status: 404 }
      );
    }

    // If already settled in our DB, return immediately without calling Pakasir
    if (order.status === "PAID") {
      return NextResponse.json({ status: "PAID", trx_id });
    }
    if (order.status === "EXPIRED" || order.status === "VOIDED") {
      return NextResponse.json({ status: "EXPIRED", trx_id });
    }

    // 3. Call Pakasir Transaction Detail API
    const pakasirBaseUrl = process.env.PAKASIR_BASE_URL ?? "https://app.pakasir.com";
    const pakasirApiKey = process.env.PAKASIR_API_KEY;
    const pakasirProject = process.env.PAKASIR_PROJECT;

    if (!pakasirApiKey || !pakasirProject) {
      return NextResponse.json(
        { error: "Payment gateway not configured" },
        { status: 500 }
      );
    }

    const url = new URL(`${pakasirBaseUrl}/api/transactiondetail`);
    url.searchParams.set("project", pakasirProject);
    url.searchParams.set("order_id", trx_id);
    url.searchParams.set("amount", String(Math.round(order.total_amount)));
    url.searchParams.set("api_key", pakasirApiKey);

    const pakasirResponse = await fetch(url.toString(), { method: "GET" });

    if (!pakasirResponse.ok) {
      const errorText = await pakasirResponse.text();
      console.error(
        `[Pakasir Status] transactiondetail failed — HTTP ${pakasirResponse.status}:`,
        errorText
      );
      // Return PENDING so the frontend keeps polling
      return NextResponse.json({ status: "PENDING", trx_id });
    }

    const pakasirData = await pakasirResponse.json();
    // Response: { transaction: { status: "completed" | "pending" | "expired", ... } }
    const pakasirStatus: string = pakasirData?.transaction?.status ?? "pending";

    // 4. Map Pakasir status → our status
    let systemStatus: "PENDING" | "PAID" | "EXPIRED";

    if (pakasirStatus === "completed") {
      systemStatus = "PAID";
    } else if (pakasirStatus === "expired") {
      systemStatus = "EXPIRED";
    } else {
      systemStatus = "PENDING";
    }

    // 5. If PAID: persist to DB so subsequent polls return early
    if (systemStatus === "PAID" && order.status !== "PAID") {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "PAID",
          amount_paid: order.total_amount,
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateError) {
        console.error("[Pakasir Status] Failed to update order to PAID:", updateError);
      } else {
        // Insert payment record (idempotent via UNIQUE order_id)
        const { error: paymentError } = await supabase
          .from("payments")
          .insert({
            order_id: order.id,
            amount: order.total_amount,
            method: "QRIS",
            reference_no: trx_id,
          });

        if (paymentError && paymentError.code !== "23505") {
          console.error("[Pakasir Status] Failed to insert payment:", paymentError);
        }
      }
    }

    return NextResponse.json({ status: systemStatus, trx_id });
  } catch (error: any) {
    console.error("[Pakasir Status] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
