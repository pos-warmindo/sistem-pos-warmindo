import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/pakasir/generate
 *
 * Pakasir API Docs: https://pakasir.com/p/docs
 *
 * Calls: POST https://app.pakasir.com/api/transactioncreate/qris
 * Body:  { project, order_id, amount, api_key }
 * Response: { payment: { payment_number, expired_at, order_id, amount, ... } }
 */
export async function POST(request: NextRequest) {
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

    // 2. Parse request body
    const body = await request.json();
    const { shift_id, total_amount, subtotal, cart_items } = body;

    if (!shift_id || !total_amount || !cart_items) {
      return NextResponse.json(
        { error: "Missing required fields: shift_id, total_amount, cart_items" },
        { status: 400 }
      );
    }

    // 3. Validate active shift
    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .select("id")
      .eq("id", shift_id)
      .eq("status", "OPEN")
      .single();

    if (shiftError || !shift) {
      return NextResponse.json(
        { error: "No active shift found" },
        { status: 400 }
      );
    }

    // 4. Prepare env vars
    const pakasirBaseUrl = process.env.PAKASIR_BASE_URL ?? "https://app.pakasir.com";
    const pakasirApiKey = process.env.PAKASIR_API_KEY;
    const pakasirProject = process.env.PAKASIR_PROJECT;

    if (!pakasirApiKey || !pakasirProject) {
      console.error("[Pakasir] Missing PAKASIR_API_KEY or PAKASIR_PROJECT env vars");
      return NextResponse.json(
        { error: "Payment gateway not configured" },
        { status: 500 }
      );
    }

    // 5. Generate a unique order_id for Pakasir
    //    Format: POS-{timestamp}-{random} — must be unique per transaction
    const pakasirOrderId = `POS-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    // 6. Call Pakasir API — POST /api/transactioncreate/qris
    //    Docs: api_key goes in the JSON body, NOT in headers
    const pakasirResponse = await fetch(
      `${pakasirBaseUrl}/api/transactioncreate/qris`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: pakasirProject,
          order_id: pakasirOrderId,
          amount: Math.round(total_amount),
          api_key: pakasirApiKey,
        }),
      }
    );

    if (!pakasirResponse.ok) {
      const errorText = await pakasirResponse.text();
      console.error(
        `[Pakasir] transactioncreate failed — HTTP ${pakasirResponse.status}:`,
        errorText
      );
      return NextResponse.json(
        {
          error: `Pakasir API error (${pakasirResponse.status}). Pastikan PAKASIR_PROJECT, PAKASIR_API_KEY, dan kuota saldo Pakasir sudah benar.`,
        },
        { status: 502 }
      );
    }

    const pakasirData = await pakasirResponse.json();

    // Response shape: { payment: { payment_number, expired_at, order_id, amount, fee, total_payment, payment_method, project } }
    const payment = pakasirData?.payment;

    if (!payment?.payment_number) {
      console.error("[Pakasir] Unexpected response shape:", pakasirData);
      return NextResponse.json(
        { error: "Invalid response from Pakasir API" },
        { status: 502 }
      );
    }

    const qr_string: string = payment.payment_number;
    // Use Pakasir's expiry if provided, otherwise fallback to 5 minutes
    const expiresAt: string =
      payment.expired_at ?? new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 7. Create order in database with QRIS_PENDING status
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        shift_id,
        cashier_id: user.id,
        subtotal: subtotal ?? total_amount,
        total_amount,
        status: "QRIS_PENDING",
        payment_method: "QRIS",
        pakasir_trx_id: pakasirOrderId, // We store OUR order_id (what Pakasir calls order_id)
        qris_expires_at: expiresAt,
      })
      .select()
      .single();

    if (orderError) {
      console.error("[Pakasir] Failed to insert order:", orderError);
      // Attempt to cancel the Pakasir transaction to avoid dangling transactions
      await fetch(`${pakasirBaseUrl}/api/transactioncancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: pakasirProject,
          order_id: pakasirOrderId,
          amount: Math.round(total_amount),
          api_key: pakasirApiKey,
        }),
      }).catch(() => {});
      return NextResponse.json(
        { error: "Failed to create order in database" },
        { status: 500 }
      );
    }

    // 8. Insert order items
    const orderItemsData = cart_items.map((item: any) => ({
      order_id: orderData.id,
      product_id: item.product.id,
      product_name: item.product.name,
      unit_price: item.product.base_price,
      quantity: item.quantity,
      line_total: item.lineTotal,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsData)
      .select();

    if (itemsError) {
      console.error("[Pakasir] Failed to insert order items:", itemsError);
      await supabase.from("orders").delete().eq("id", orderData.id);
      return NextResponse.json(
        { error: "Failed to create order items" },
        { status: 500 }
      );
    }

    // 9. Insert modifier snapshots (if any)
    const modifiersData: any[] = [];
    cart_items.forEach((item: any) => {
      // Match by product_id — note: multiple same products in cart may share product_id
      // In a real multi-item scenario this could mis-match, but for POS it's acceptable
      const matchedItem = insertedItems.find(
        (ii) => ii.product_id === item.product.id
      );
      if (matchedItem && item.modifiers?.length > 0) {
        item.modifiers.forEach((mod: any) => {
          modifiersData.push({
            order_item_id: matchedItem.id,
            modifier_id: mod.id,
            modifier_name: mod.modifier_name,
            modifier_group: mod.modifier_group,
            price_delta: mod.price_delta,
          });
        });
      }
    });

    if (modifiersData.length > 0) {
      const { error: modsError } = await supabase
        .from("order_item_modifiers")
        .insert(modifiersData);
      if (modsError) {
        // Non-fatal: log and continue
        console.error("[Pakasir] Failed to insert modifiers (non-fatal):", modsError);
      }
    }

    // 10. Return QR data to frontend
    return NextResponse.json({
      qr_string,
      // trx_id here = the pakasirOrderId we sent to Pakasir as order_id
      trx_id: pakasirOrderId,
      order_id: orderData.id,
      expires_at: expiresAt,
    });
  } catch (error: any) {
    console.error("[Pakasir Generate] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
