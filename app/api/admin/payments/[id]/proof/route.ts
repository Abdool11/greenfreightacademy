import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/admin/payments/:id/proof — creates a short-lived signed URL for an
// admin to view a private EFT proof. The storage path is never exposed publicly.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .select("proof_url")
    .eq("id", id)
    .single();
  if (error || !payment?.proof_url) return NextResponse.json({ error: "No proof of payment is attached to this record." }, { status: 404 });

  const { data: signed, error: signedError } = await supabaseAdmin.storage
    .from("payment-proofs")
    .createSignedUrl(payment.proof_url, 60 * 10);
  if (signedError || !signed?.signedUrl) return NextResponse.json({ error: "Could not open the proof of payment." }, { status: 500 });

  return NextResponse.redirect(signed.signedUrl);
}
