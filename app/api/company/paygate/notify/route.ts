import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { validateNotifyChecksum, getPaygateKey } from "@/lib/paygate";

/**
 * Paygate ITN (Instant Transaction Notification) webhook handler.
 * Paygate sends a server-to-server POST with form-encoded data.
 * We must respond with plain text "OK".
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = String(value);
    }

    const encryptionKey = getPaygateKey();
    if (!encryptionKey) {
      console.error("Paygate notify: encryption key not configured");
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    // Validate checksum
    const valid = validateNotifyChecksum(params, encryptionKey);
    if (!valid) {
      console.error("Paygate notify: checksum validation failed", params);
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    // TRANSACTION_STATUS: 1 = Approved, 2 = Declined, 3 = Cancelled, 4 = User Cancelled
    const status = params.TRANSACTION_STATUS;
    const reference = params.REFERENCE;
    const payRequestId = params.PAY_REQUEST_ID;

    if (status === "1") {
      // Payment approved — mark quote as paid
      const { data: quote } = await supabaseAdmin
        .from("quotes")
        .select("id, status, total, company_id")
        .eq("reference", reference)
        .eq("pay_request_id", payRequestId)
        .single();

      if (quote && quote.status !== "paid" && quote.status !== "deployed") {
        await supabaseAdmin
          .from("quotes")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            paygate_transaction_id: params.TRANSACTION_ID || null,
            paygate_auth_code: params.AUTH_CODE || null,
          })
          .eq("id", quote.id);

        // Record payment in payments table
        await supabaseAdmin.from("payments").insert({
          company_id: quote.company_id,
          quote_id: quote.id,
          payment_method: "paygate",
          amount: quote.total,
          status: "completed",
          paygate_transaction_id: params.TRANSACTION_ID || null,
          paygate_auth_code: params.AUTH_CODE || null,
          created_at: new Date().toISOString(),
        }).then();
      }
    } else {
      // Payment not approved — log for debugging
      console.log(`Paygate notify: payment not approved. Status=${status}, Reference=${reference}`);
    }

    // Must respond with plain text "OK"
    return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (err) {
    console.error("Paygate notify error:", err);
    // Still respond OK to prevent retries
    return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
}
