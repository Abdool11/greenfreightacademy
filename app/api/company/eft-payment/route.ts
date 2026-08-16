import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { adminNotify, writeLedgerEntry } from "@/lib/adminNotify";
import { getSupplierProfile } from "@/lib/quoteProfiles";

export const dynamic = "force-dynamic";

const MAX_PROOF_SIZE = 10 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const money = (value: number) => `R ${value.toFixed(2)}`;

async function readSubmission(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const data = await req.formData();
    const proof = data.get("proof");
    return {
      quoteId: clean(data.get("quoteId")),
      eftReference: clean(data.get("eftReference")),
      eftAmount: clean(data.get("eftAmount")),
      eftDate: clean(data.get("eftDate")),
      notes: clean(data.get("notes")),
      proof: proof instanceof File && proof.size > 0 ? proof : null,
    };
  }
  const body = await req.json();
  return {
    quoteId: clean(body.quoteId),
    eftReference: clean(body.eftReference),
    eftAmount: clean(body.eftAmount),
    eftDate: clean(body.eftDate),
    notes: clean(body.notes),
    proof: null as File | null,
  };
}

async function uploadProof(companyId: string, quoteId: string, proof: File | null) {
  if (!proof) return { url: null as string | null, fileName: null as string | null };
  if (!ALLOWED_PROOF_TYPES.has(proof.type)) throw new Error("Proof of payment must be a PDF, JPG, or PNG file.");
  if (proof.size > MAX_PROOF_SIZE) throw new Error("Proof of payment must be 10 MB or smaller.");

  const safeName = proof.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${companyId}/${quoteId}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await proof.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from("payment-proofs")
    .upload(path, buffer, { contentType: proof.type, upsert: false });
  if (error) throw new Error("Could not store your proof of payment. Please try again.");
  return { url: path, fileName: proof.name };
}

// GET /api/company/eft-payment?quoteId=... — authenticated EFT instructions for one client quote.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const quoteId = req.nextUrl.searchParams.get("quoteId");
  if (!quoteId) return NextResponse.json({ error: "quoteId is required" }, { status: 400 });

  const { data: quote, error } = await supabaseAdmin
    .from("quotes")
    .select("id, reference, total, status, valid_until, supplier_snapshot")
    .eq("id", quoteId)
    .eq("company_id", session.companyId)
    .single();
  if (error || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (["paid", "approved", "deployed"].includes(quote.status)) return NextResponse.json({ error: "This quote has already been paid or deployed." }, { status: 409 });

  const fallbackSupplier = await getSupplierProfile();
  const supplier = quote.supplier_snapshot && typeof quote.supplier_snapshot === "object" && Object.keys(quote.supplier_snapshot as object).length > 0
    ? quote.supplier_snapshot
    : fallbackSupplier;
  return NextResponse.json({ quote, supplier });
}

// POST /api/company/eft-payment — client submits an EFT notice for a formal quote.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const submission = await readSubmission(req);
  const claimedAmount = Number(submission.eftAmount);
  if (!submission.quoteId || !submission.eftReference || !Number.isFinite(claimedAmount) || claimedAmount <= 0 || !submission.eftDate) {
    return NextResponse.json({ error: "Quote, payment reference, amount paid, and payment date are required." }, { status: 400 });
  }

  const { data: quote, error: quoteError } = await supabaseAdmin
    .from("quotes")
    .select("id, reference, total, status, company_id")
    .eq("id", submission.quoteId)
    .eq("company_id", session.companyId)
    .single();
  if (quoteError || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (["paid", "approved", "deployed"].includes(quote.status)) {
    return NextResponse.json({ error: "This quote has already been paid or deployed." }, { status: 409 });
  }

  let proofUrl: string | null = null;
  let proofFileName: string | null = null;
  try {
    const upload = await uploadProof(session.companyId, quote.id, submission.proof);
    proofUrl = upload.url;
    proofFileName = upload.fileName;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Proof upload failed." }, { status: 400 });
  }

  const expectedAmount = Number(quote.total ?? 0);
  const varianceAmount = Math.round((claimedAmount - expectedAmount) * 100) / 100;
  const now = new Date().toISOString();

  // A client may resubmit a pending EFT after correction. Re-use that pending
  // payment record rather than creating duplicates for the same quote.
  const { data: pendingPayment } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("quote_id", quote.id)
    .in("status", ["pending_verification", "clarification_requested"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const paymentPayload = {
    company_id: session.companyId,
    quote_id: quote.id,
    payment_method: "eft",
    amount: claimedAmount,
    currency: "ZAR",
    reference: submission.eftReference,
    eft_reference: submission.eftReference,
    eft_date: submission.eftDate,
    notes: submission.notes || null,
    proof_url: proofUrl,
    proof_file_name: proofFileName,
    expected_amount_snapshot: expectedAmount,
    variance_amount: varianceAmount,
    status: "pending_verification",
    reconciliation_status: varianceAmount === 0 ? "pending" : "variance_review",
    reconciliation_notes: null,
    reconciled_at: null,
    reconciled_by: null,
    rejected_at: null,
    rejected_by: null,
    rejection_reason: null,
  };

  let paymentId: string;
  if (pendingPayment?.id) {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .update(paymentPayload)
      .eq("id", pendingPayment.id)
      .select("id")
      .single();
    if (error || !data) return NextResponse.json({ error: "Failed to update your EFT notification." }, { status: 500 });
    paymentId = data.id;
  } else {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .insert({ ...paymentPayload, created_at: now })
      .select("id")
      .single();
    if (error || !data) {
      console.error("EFT payment insert error:", error);
      return NextResponse.json({ error: "Failed to record your EFT notification." }, { status: 500 });
    }
    paymentId = data.id;
  }

  const { error: quoteUpdateError } = await supabaseAdmin
    .from("quotes")
    .update({ status: "eft_submitted", eft_reference: submission.eftReference, eft_submitted_at: now, payment_method: "eft" })
    .eq("id", quote.id);
  if (quoteUpdateError) return NextResponse.json({ error: "Payment notice was saved, but the quote status could not be updated." }, { status: 500 });

  await supabaseAdmin.from("payment_reconciliation_events").insert({
    payment_id: paymentId,
    quote_id: quote.id,
    company_id: session.companyId,
    event_type: pendingPayment?.id ? "submitted" : "submitted",
    expected_amount: expectedAmount,
    submitted_amount: claimedAmount,
    variance_amount: varianceAmount,
    eft_reference: submission.eftReference,
    notes: submission.notes || null,
    performed_by: session.email || session.companyName || "client",
    created_at: now,
  });

  const config = await getConfigs(["email_booking_to"]);
  if (config.email_booking_to && process.env.BREVO_SMTP_PASSWORD) {
    try {
      await sendEmail({
        from: "abdool@transportactiongroup.co.za",
        fromName: "GFA Platform",
        to: config.email_booking_to,
        subject: `EFT verification required — ${quote.reference} — ${session.companyName}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:640px"><h2 style="color:#16a34a">EFT payment awaiting reconciliation</h2><p><strong>${escapeHtml(session.companyName)}</strong> submitted an EFT notice.</p><table style="border-collapse:collapse;width:100%"><tr><td style="padding:6px;color:#6b7280">Quote</td><td style="padding:6px;font-weight:700">${escapeHtml(quote.reference)}</td></tr><tr><td style="padding:6px;color:#6b7280">Expected amount</td><td style="padding:6px">${money(expectedAmount)}</td></tr><tr><td style="padding:6px;color:#6b7280">Amount claimed</td><td style="padding:6px">${money(claimedAmount)}</td></tr><tr><td style="padding:6px;color:#6b7280">Variance</td><td style="padding:6px;color:${varianceAmount === 0 ? "#16a34a" : "#dc2626"}">${money(varianceAmount)}</td></tr><tr><td style="padding:6px;color:#6b7280">EFT reference</td><td style="padding:6px">${escapeHtml(submission.eftReference)}</td></tr><tr><td style="padding:6px;color:#6b7280">Payment date</td><td style="padding:6px">${escapeHtml(submission.eftDate)}</td></tr><tr><td style="padding:6px;color:#6b7280">Proof attached</td><td style="padding:6px">${proofUrl ? "Yes — view in Reconciliation Inbox" : "Not supplied"}</td></tr></table><p>Open <strong>Admin → Finance & Ledger → Pending EFT</strong> to reconcile and decide.</p></div>`,
      });
    } catch (error) { console.error("EFT admin email error:", error); }
  }

  await adminNotify("eft_submitted", {
    message: `${session.companyName} submitted EFT ${submission.eftReference} for ${quote.reference} — reconciliation required.`,
    actionUrl: "/admin/finance?tab=pending",
    details: {
      Company: session.companyName,
      "Quote Ref": quote.reference,
      Expected: money(expectedAmount),
      Claimed: money(claimedAmount),
      Variance: money(varianceAmount),
      "EFT Reference": submission.eftReference,
    },
  });

  await writeLedgerEntry({
    company_id: session.companyId,
    entry_type: "eft_submitted",
    amount: claimedAmount,
    description: `EFT submitted for reconciliation — ${quote.reference}`,
    reference: submission.eftReference,
    quote_id: quote.id,
    payment_id: paymentId,
    status: "pending",
    created_by: session.email || "client",
  });

  return NextResponse.json({
    ok: true,
    paymentId,
    expectedAmount,
    claimedAmount,
    varianceAmount,
    message: varianceAmount === 0
      ? "Your EFT payment notice has been submitted and is awaiting verification."
      : "Your EFT payment notice has been submitted. The amount differs from the quote total, so our finance team will review it before approval.",
  });
}
