import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/pakasir/mock-pay
 *
 * Pakasir Payment Simulation — Docs: https://pakasir.com/p/docs (Section C.4)
 * Only works when project is in SANDBOX mode on Pakasir dashboard.
 *
 * Calls: POST https://app.pakasir.com/api/paymentsimulation
 * Body:  { project, order_id, amount, api_key }
 *
 * After calling this, Pakasir will fire the webhook to our server
 * which then updates the order to PAID.
 *
 * Usage (browser console / Thunder Client):
 *   POST /api/pakasir/mock-pay
 *   { "order_id": "POS-1719400000-ABC123", "amount": 25000 }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, amount } = body;

    if (!order_id || !amount) {
      return NextResponse.json(
        { error: "order_id and amount are required" },
        { status: 400 }
      );
    }

    const pakasirBaseUrl = process.env.PAKASIR_BASE_URL ?? "https://app.pakasir.com";
    const pakasirApiKey = process.env.PAKASIR_API_KEY;
    const pakasirProject = process.env.PAKASIR_PROJECT;

    if (!pakasirApiKey || !pakasirProject) {
      return NextResponse.json(
        { error: "Payment gateway not configured" },
        { status: 500 }
      );
    }

    // Call Pakasir payment simulation API
    const response = await fetch(`${pakasirBaseUrl}/api/paymentsimulation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: pakasirProject,
        order_id,
        amount: Math.round(amount),
        api_key: pakasirApiKey,
      }),
    });

    const data = await response.text();

    if (!response.ok) {
      console.error("[Mock Pay] Pakasir simulation failed:", response.status, data);
      return NextResponse.json(
        {
          error: `Pakasir simulation error (${response.status}). Pastikan proyek dalam mode Sandbox.`,
          detail: data,
        },
        { status: 502 }
      );
    }

    console.log("[Mock Pay] Simulation response:", data);

    return NextResponse.json({
      success: true,
      message:
        "Payment simulation triggered. Pakasir will send webhook to your server.",
      detail: data,
    });
  } catch (error: any) {
    console.error("[Mock Pay] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
