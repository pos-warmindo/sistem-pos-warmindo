import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/pakasir/cancel
 *
 * Pakasir Transaction Cancel — Docs: https://pakasir.com/p/docs (Section C.5)
 *
 * Calls: POST https://app.pakasir.com/api/transactioncancel
 * Body:  { project, order_id, amount, api_key }
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

    const pakasirResponse = await fetch(
      `${pakasirBaseUrl}/api/transactioncancel`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: pakasirProject,
          order_id,
          amount: Math.round(amount),
          api_key: pakasirApiKey,
        }),
      }
    );

    const responseText = await pakasirResponse.text();

    if (!pakasirResponse.ok) {
      console.error(
        `[Pakasir Cancel] HTTP ${pakasirResponse.status}:`,
        responseText
      );
      // Non-fatal — return success anyway so frontend can proceed with voiding
      return NextResponse.json({ success: false, detail: responseText });
    }

    return NextResponse.json({ success: true, detail: responseText });
  } catch (error: any) {
    console.error("[Pakasir Cancel] Error:", error);
    // Non-fatal — return success so frontend still voids the order
    return NextResponse.json({ success: false, error: error.message });
  }
}
