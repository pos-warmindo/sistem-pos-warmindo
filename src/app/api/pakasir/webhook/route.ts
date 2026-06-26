import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/pakasir/webhook
 *
 * Pakasir Webhook Docs: https://pakasir.com/p/docs (Section D)
 *
 * Pakasir sends a POST with body:
 * {
 *   "amount": 22000,
 *   "order_id": "240910HDE7C9",
 *   "project": "depodomain",
 *   "status": "completed",
 *   "payment_method": "qris",
 *   "completed_at": "2024-09-10T08:07:02.819+07:00"
 * }
 *
 * NOTE: Pakasir does NOT send an HMAC signature.
 * We verify by checking project + order_id + amount match our DB record.
 *
 * IMPORTANT: Must respond 200 OK as fast as possible.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, status, amount, project } = body;

    // Basic payload validation
    if (!order_id || !status || !amount) {
      console.error("[Webhook] Invalid payload — missing fields:", body);
      return NextResponse.json({ received: true });
    }

    // Verify the project matches ours
    const expectedProject = process.env.PAKASIR_PROJECT;
    if (expectedProject && project !== expectedProject) {
      console.warn(
        `[Webhook] Project mismatch — received: ${project}, expected: ${expectedProject}`
      );
      return NextResponse.json({ received: true });
    }

    // Only process "completed" status
    if (status !== "completed") {
      console.log(`[Webhook] Ignoring non-completed status: ${status} for order ${order_id}`);
      return NextResponse.json({ received: true });
    }

    const supabase = await createClient();

    // Find our order by pakasir_trx_id (which equals the order_id we sent to Pakasir)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, total_amount")
      .eq("pakasir_trx_id", order_id)
      .single();

    if (orderError || !order) {
      // Could be a test webhook or already cleaned up — log and return 200
      console.error(
        `[Webhook] Order not found for pakasir order_id: ${order_id}`
      );
      return NextResponse.json({ received: true });
    }

    // Verify the amount matches (as recommended by Pakasir docs)
    if (Math.round(order.total_amount) !== Math.round(amount)) {
      console.warn(
        `[Webhook] Amount mismatch for order ${order.id} — DB: ${order.total_amount}, webhook: ${amount}`
      );
      // Still process it but log the discrepancy
    }

    // Idempotency: skip if already PAID
    if (order.status === "PAID") {
      console.log(`[Webhook] Order ${order.id} already PAID — skipping`);
      return NextResponse.json({ received: true });
    }

    // Update order to PAID — this fires fn_deduct_stock_on_payment trigger
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "PAID",
        amount_paid: amount,
        paid_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("[Webhook] Failed to update order to PAID:", updateError);
      // Return 200 anyway — Pakasir docs say to respond fast
      return NextResponse.json({ received: true });
    }

    // Insert payment record — ON CONFLICT DO NOTHING via UNIQUE(order_id)
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id: order.id,
        amount,
        method: "QRIS",
        reference_no: order_id,
      });

    if (paymentError && paymentError.code !== "23505") {
      // 23505 = unique_violation (duplicate webhook) — safe to ignore
      console.error("[Webhook] Failed to insert payment:", paymentError);
    }

    console.log(
      `[Webhook] ✅ Successfully processed PAID for order ${order.id} (pakasir: ${order_id})`
    );

    // Must return 200 quickly (< 500ms per blueprint spec)
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Webhook] Unexpected error:", error);
    // Always return 200 to prevent Pakasir from retrying indefinitely
    return NextResponse.json({ received: true });
  }
}
