import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
const dayBounds = (date: string) => ({ from: `${date}T00:00:00+02:00`, to: `${date}T23:59:59.999+02:00` });

export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const date = req.nextUrl.searchParams.get("date") || new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const { from, to } = dayBounds(date);

  const [{ data: payments }, { data: quoteEvents }, { data: drivers }, { data: started }, { data: completed }, { data: certificates }, { data: discounts }, { data: pendingEfts }, { data: pendingQuotes }] = await Promise.all([
    supabaseAdmin.from("payments").select("id, amount, payment_method, status, created_at, quote_id, eft_reference, quotes(reference, companies(name))").eq("status", "confirmed").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false }),
    supabaseAdmin.from("quotes").select("id, total, status, created_at, paid_at").gte("created_at", from).lte("created_at", to),
    supabaseAdmin.from("drivers").select("id").gte("created_at", from).lte("created_at", to),
    supabaseAdmin.from("enrolments").select("id").gte("started_at", from).lte("started_at", to),
    supabaseAdmin.from("enrolments").select("id").gte("completed_at", from).lte("completed_at", to),
    supabaseAdmin.from("certifications").select("id").gte("issued_at", from).lte("issued_at", to),
    supabaseAdmin.from("discount_requests").select("id, discount_amount, revised_total, applied_at").eq("status", "applied").gte("applied_at", from).lte("applied_at", to),
    supabaseAdmin.from("payments").select("id").in("status", ["pending_verification", "clarification_requested"]).eq("payment_method", "eft"),
    supabaseAdmin.from("quotes").select("id").eq("status", "pending"),
  ]);

  const receiptRows = payments ?? [];
  const cashReceived = receiptRows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const cardReceived = receiptRows.filter((payment) => payment.payment_method === "paystack").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const eftReceived = receiptRows.filter((payment) => payment.payment_method === "eft").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const discountValue = (discounts ?? []).reduce((sum, discount) => sum + Number(discount.discount_amount || 0), 0);
  const quotesIssued = (quoteEvents ?? []).length;
  const grossQuoted = (quoteEvents ?? []).reduce((sum, quote) => sum + Number(quote.total || 0), 0);

  return NextResponse.json({
    date, from, to,
    summary: { cashReceived, cardReceived, eftReceived, quotesIssued, grossQuoted, driversAdded: (drivers ?? []).length, trainingStarts: (started ?? []).length, trainingCompletions: (completed ?? []).length, certificatesIssued: (certificates ?? []).length, discountsApplied: (discounts ?? []).length, discountValue, pendingEfts: (pendingEfts ?? []).length, pendingQuotes: (pendingQuotes ?? []).length },
    cashbook: receiptRows,
  });
}
