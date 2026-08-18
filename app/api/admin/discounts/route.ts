import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { adminNotify, writeLedgerEntry } from "@/lib/adminNotify";
import { sendEmail } from "@/lib/email";
import { calculateDiscount, DiscountType, formatZar } from "@/lib/discounts";

export const dynamic = "force-dynamic";
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const roleCap = (role: "admin" | "super_admin") => role === "super_admin" ? 100 : 20;

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const [{ data: requests }, { data: quotes }, { data: rules }] = await Promise.all([
    supabaseAdmin.from("discount_requests").select("*, quotes(id, reference, total, subtotal, status), companies(name)").order("requested_at", { ascending: false }).limit(200),
    supabaseAdmin.from("quotes").select("id, reference, subtotal, total, status, company_id, companies(name)").in("status", ["pending", "eft_submitted"]).order("created_at", { ascending: false }).limit(200),
    supabaseAdmin.from("discount_authority_rules").select("*").order("role"),
  ]);
  return NextResponse.json({ requests: requests ?? [], quotes: quotes ?? [], rules: rules ?? [], currentRole: session.role, currentAdminId: session.adminId });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const body = await req.json();
  const action = clean(body.action);

  if (action === "create") {
    const quoteId = clean(body.quoteId);
    const discountType = clean(body.discountType) as DiscountType;
    const requestedValue = Number(body.requestedValue);
    const reasonCategory = clean(body.reasonCategory);
    const reasonNote = clean(body.reasonNote);
    const supportingReference = clean(body.supportingReference);
    if (!quoteId || !reasonCategory || !reasonNote || !Number.isFinite(requestedValue)) return NextResponse.json({ error: "Quote, discount value, reason category and reason are required." }, { status: 400 });

    const [{ data: quote }, { data: rule }] = await Promise.all([
      supabaseAdmin.from("quotes").select("id, reference, company_id, subtotal, total, status, line_items, billing_profile_snapshot, supplier_snapshot, valid_until, purchase_order_ref, cost_centre, quote_version").eq("id", quoteId).single(),
      supabaseAdmin.from("discount_authority_rules").select("*").eq("role", session.role).maybeSingle(),
    ]);
    if (!quote) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    if (!["pending", "eft_submitted"].includes(quote.status)) return NextResponse.json({ error: "Only unpaid quotes can receive a discount request." }, { status: 409 });

    let calculation;
    try { calculation = calculateDiscount(Number(quote.subtotal ?? 0), discountType, requestedValue); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid discount." }, { status: 400 }); }
    const requestCap = Math.min(roleCap(session.role), Number(rule?.max_request_percent ?? 0));
    if (!rule || calculation.requestedPercent > requestCap) return NextResponse.json({ error: `Your role may request discounts up to ${requestCap}%.` }, { status: 403 });

    const requestReference = `DISC-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();
    const { data: request, error } = await supabaseAdmin.from("discount_requests").insert({
      quote_id: quote.id, company_id: quote.company_id, request_reference: requestReference, discount_type: discountType, requested_value: requestedValue,
      requested_percent: calculation.requestedPercent, list_subtotal: calculation.listSubtotal, discount_amount: calculation.discountAmount,
      revised_subtotal: calculation.revisedSubtotal, revised_vat: calculation.revisedVat, revised_total: calculation.revisedTotal,
      reason_category: reasonCategory, reason_note: reasonNote, supporting_reference: supportingReference || null,
      status: "pending", requested_by: session.adminId, requested_by_name: session.name || session.email, requested_at: now,
    }).select().single();
    if (error || !request) return NextResponse.json({ error: "Could not save the discount request." }, { status: 500 });
    await supabaseAdmin.from("discount_events").insert({ discount_request_id: request.id, event_type: "requested", performed_by: session.adminId, performed_by_name: session.name || session.email, note: reasonNote, created_at: now });
    await adminNotify("discount_requested", { message: `${session.name || session.email} requested ${calculation.requestedPercent}% off quote ${quote.reference}.`, actionUrl: "/admin/discounts", details: { Quote: quote.reference, Request: requestReference, Discount: formatZar(calculation.discountAmount), "Revised total": formatZar(calculation.revisedTotal), Reason: reasonCategory } });
    return NextResponse.json({ ok: true, request });
  }

  if (action === "decide") {
    const requestId = clean(body.requestId);
    const decision = clean(body.decision);
    const approvalNote = clean(body.approvalNote);
    if (!requestId || !["approve", "reject"].includes(decision)) return NextResponse.json({ error: "A request and approval decision are required." }, { status: 400 });
    if (decision === "reject" && !approvalNote) return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });

    const [{ data: request }, { data: rule }] = await Promise.all([
      supabaseAdmin.from("discount_requests").select("*, quotes(id, reference, company_id, status, line_items, billing_profile_snapshot, supplier_snapshot, valid_until, purchase_order_ref, cost_centre, quote_version)").eq("id", requestId).single(),
      supabaseAdmin.from("discount_authority_rules").select("*").eq("role", session.role).maybeSingle(),
    ]);
    if (!request) return NextResponse.json({ error: "Discount request not found." }, { status: 404 });
    if (request.status !== "pending") return NextResponse.json({ error: `This request is already ${request.status}.` }, { status: 409 });
    const approvalCap = Math.min(roleCap(session.role), Number(rule?.max_approval_percent ?? 0));
    if (!rule || Number(request.requested_percent) > approvalCap) return NextResponse.json({ error: `Your role does not have authority to approve discounts above ${approvalCap}%.` }, { status: 403 });
    if (request.requested_by === session.adminId) return NextResponse.json({ error: "The requesting admin cannot approve their own discount request." }, { status: 403 });

    const quote = Array.isArray(request.quotes) ? request.quotes[0] : request.quotes;
    if (!quote || !["pending", "eft_submitted"].includes(quote.status)) return NextResponse.json({ error: "The linked quote is no longer eligible for revision." }, { status: 409 });
    const now = new Date().toISOString();
    if (decision === "reject") {
      await supabaseAdmin.from("discount_requests").update({ status: "rejected", rejected_by: session.adminId, rejected_by_name: session.name || session.email, rejected_at: now, rejection_reason: approvalNote }).eq("id", request.id);
      await supabaseAdmin.from("discount_events").insert({ discount_request_id: request.id, event_type: "rejected", performed_by: session.adminId, performed_by_name: session.name || session.email, note: approvalNote, created_at: now });
      return NextResponse.json({ ok: true, status: "rejected" });
    }

    const nextVersion = Number(quote.quote_version ?? 1) + 1;
    const quoteUpdate = {
      subtotal: Number(request.revised_subtotal), vat: Number(request.revised_vat), total: Number(request.revised_total),
      list_subtotal: Number(request.list_subtotal), discount_percent: Number(request.requested_percent), discount_amount: Number(request.discount_amount),
      discount_note: `${request.reason_category}: ${request.reason_note}`, discount_request_id: request.id, discount_applied_at: now,
      discount_applied_by: session.name || session.email, quote_version: nextVersion, status: "pending", issued_at: now,
    };
    const { error: quoteError } = await supabaseAdmin.from("quotes").update(quoteUpdate).eq("id", quote.id);
    if (quoteError) return NextResponse.json({ error: "Could not revise the quote." }, { status: 500 });
    const discountSnapshot = { request_reference: request.request_reference, discount_type: request.discount_type, requested_percent: Number(request.requested_percent), discount_amount: Number(request.discount_amount), list_subtotal: Number(request.list_subtotal), reason_category: request.reason_category, reason_note: request.reason_note, approved_by: session.name || session.email, approved_at: now };
    await supabaseAdmin.from("quote_versions").insert({ quote_id: quote.id, version_number: nextVersion, reference: quote.reference, status: "discounted", line_items: quote.line_items ?? [], billing_snapshot: quote.billing_profile_snapshot ?? {}, supplier_snapshot: quote.supplier_snapshot ?? {}, subtotal: Number(request.revised_subtotal), vat: Number(request.revised_vat), total: Number(request.revised_total), valid_until: quote.valid_until, purchase_order_ref: quote.purchase_order_ref, cost_centre: quote.cost_centre, issued_by: session.adminId, issued_at: now, discount_snapshot: discountSnapshot });
    await supabaseAdmin.from("discount_requests").update({ status: "applied", approved_by: session.adminId, approved_by_name: session.name || session.email, approved_at: now, approval_note: approvalNote || null, applied_at: now, applied_quote_version: nextVersion }).eq("id", request.id);
    await supabaseAdmin.from("discount_events").insert([{ discount_request_id: request.id, event_type: "approved", performed_by: session.adminId, performed_by_name: session.name || session.email, note: approvalNote || null, created_at: now }, { discount_request_id: request.id, event_type: "applied", performed_by: session.adminId, performed_by_name: session.name || session.email, note: `Quote revised to version ${nextVersion}.`, created_at: now }]);
    await writeLedgerEntry({ company_id: quote.company_id, entry_type: "discount_applied", amount: -Number(request.discount_amount), description: `Approved discount ${request.request_reference} applied to ${quote.reference}`, reference: request.request_reference, quote_id: quote.id, status: "confirmed", created_by: session.email || "admin" });

    const { data: clientCompany } = await supabaseAdmin.from("companies").select("contact_email").eq("id", quote.company_id).single();
    const billingRaw = quote.billing_profile_snapshot && typeof quote.billing_profile_snapshot === "object" ? quote.billing_profile_snapshot as Record<string, unknown> : {};
    const accountsEmail = typeof billingRaw.accounts_email === "string" ? billingRaw.accounts_email : "";
    const recipientList = [...new Set([clientCompany?.contact_email, accountsEmail].filter(Boolean))] as string[];
    if (recipientList.length > 0 && process.env.BREVO_SMTP_PASSWORD) {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://greenfreightacademy.co.za";
        await sendEmail({
          from: "abdool@transportactiongroup.co.za", fromName: "Green Freight Academy", to: recipientList,
          subject: `Revised training quotation — ${quote.reference}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px"><h2 style="color:#16a34a">Your revised quotation is ready</h2><p>An approved commercial discount has been applied to quotation <strong>${quote.reference}</strong>.</p><p>Discount: <strong>${formatZar(Number(request.discount_amount))}</strong><br />Revised total (incl. VAT): <strong>${formatZar(Number(request.revised_total))}</strong></p><p><a href="${siteUrl}/api/company/quotes/${quote.id}/pdf" style="display:inline-block;background:#16a34a;color:#07130a;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Download revised quote</a></p><p>You can pay by card or EFT from your GFA dashboard.</p></div>`,
        });
      } catch (error) { console.error("Revised quote email error:", error); }
    }
    await adminNotify("discount_approved", { message: `${request.request_reference} was approved and applied to quote ${quote.reference}.`, actionUrl: "/admin/discounts", details: { Quote: quote.reference, Discount: formatZar(Number(request.discount_amount)), "Revised total": formatZar(Number(request.revised_total)), Version: String(nextVersion) } });
    return NextResponse.json({ ok: true, status: "applied", quoteId: quote.id, quoteVersion: nextVersion });
  }

  return NextResponse.json({ error: "Unsupported discount action." }, { status: 400 });
}
