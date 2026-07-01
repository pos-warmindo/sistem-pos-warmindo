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
 *   "status": "completed" | "expired" | "failed",
 *   "payment_method": "qris",
 *   "completed_at": "2024-09-10T08:07:02.819+07:00"
 * }
 *
 * NOTE: Pakasir does NOT send an HMAC signature.
 * We verify by checking project + order_id match our DB record.
 *
 * IMPORTANT: Must respond 200 OK as fast as possible (< 500ms).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, status, amount, project } = body;

    // Basic payload validation — order_id and status are always required
    if (!order_id || !status) {
      console.error("[Webhook] Invalid payload — missing order_id or status:", body);
      return NextResponse.json({ received: true });
    }

    // Verify the project matches ours (if env var set)
    const expectedProject = process.env.PAKASIR_PROJECT;
    if (expectedProject && project !== expectedProject) {
      console.warn(
        `[Webhook] Project mismatch — received: ${project}, expected: ${expectedProject}`
      );
      return NextResponse.json({ received: true });
    }

    // Map Pakasir status → our order status
    // Pakasir sends: "completed" | "expired" | "failed"
    type OurStatus = "PAID" | "EXPIRED" | "VOIDED";

    const statusMap: Record<string, OurStatus> = {
      completed: "PAID",
      expired:   "EXPIRED",
      failed:    "VOIDED",
    };

    const targetStatus = statusMap[status];
    if (!targetStatus) {
      console.log(`[Webhook] Unknown status "${status}" — ignoring`);
      return NextResponse.json({ received: true });
    }

    const supabase = await createClient();

    // Find our order by pakasir_trx_id
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, total_amount")
      .eq("pakasir_trx_id", order_id)
      .single();

    if (orderError || !order) {
      console.error(`[Webhook] Order not found for pakasir order_id: ${order_id}`);
      return NextResponse.json({ received: true });
    }

    // Idempotency: skip if order already in a terminal status
    const terminalStatuses = ["PAID", "EXPIRED", "VOIDED"];
    if (terminalStatuses.includes(order.status)) {
      console.log(
        `[Webhook] Order ${order.id} already in terminal status ${order.status} — skipping`
      );
      return NextResponse.json({ received: true });
    }

    // ── Handle PAID (completed) ─────────────────────────────
    if (targetStatus === "PAID") {
      if (amount && Math.round(order.total_amount) !== Math.round(amount)) {
        console.warn(
          `[Webhook] Amount mismatch for order ${order.id} — DB: ${order.total_amount}, webhook: ${amount}`
        );
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status:     "PAID",
          amount_paid: amount ?? order.total_amount,
          paid_at:    new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateError) {
        console.error("[Webhook] Failed to update order to PAID:", updateError);
        return NextResponse.json({ received: true });
      }

      // Insert payment record — idempotent via UNIQUE(order_id)
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id:    order.id,
          amount:      amount ?? order.total_amount,
          method:      "QRIS",
          reference_no: order_id,
        });

      if (paymentError && paymentError.code !== "23505") {
        console.error("[Webhook] Failed to insert payment:", paymentError);
      }

      console.log(
        `[Webhook] ✅ PAID — order ${order.id} (pakasir: ${order_id})`
      );
    }

    // ── Handle EXPIRED ──────────────────────────────────────
    if (targetStatus === "EXPIRED") {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status:     "EXPIRED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateError) {
        console.error("[Webhook] Failed to update order to EXPIRED:", updateError);
      } else {
        console.log(
          `[Webhook] ⏰ EXPIRED — order ${order.id} (pakasir: ${order_id})`
        );
      }
    }

    // ── Handle FAILED / VOIDED ──────────────────────────────
    if (targetStatus === "VOIDED") {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status:     "VOIDED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateError) {
        console.error("[Webhook] Failed to update order to VOIDED:", updateError);
      } else {
        console.log(
          `[Webhook] ❌ FAILED/VOIDED — order ${order.id} (pakasir: ${order_id})`
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Webhook] Unexpected error:", error);
    // Always return 200 — prevent Pakasir from retrying indefinitely
    return NextResponse.json({ received: true });
  }
}
