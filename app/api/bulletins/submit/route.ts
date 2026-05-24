import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCompanyFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const company = await getCompanyFromRequest(req);
    if (!company) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      category,
      date_observed,
      description,
      why_it_matters,
      mitigation_message,
      driver_action,
      urgency,
      audience_type,
      audience_ids,
      confidential,
      supporting_file_url,
      understanding_questions,
      image_urls,   // array of public image URLs (max 3)
      waive_fee,    // boolean — client opts urgent bulletin into CPD library to waive fee
    } = body;

    if (!title || !category || !description || !mitigation_message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const isUrgent = urgency === "urgent";

    // Derive effective distribution:
    // - standard bulletins always go to community CPD library (auto)
    // - urgent + waive_fee → both (company + CPD library, pending admin approval)
    // - urgent + no waive → company_only, status = pending_payment
    let effectiveDistribution: string;
    if (!isUrgent) {
      effectiveDistribution = "cpd_library";
    } else if (waive_fee) {
      effectiveDistribution = "both";
    } else {
      effectiveDistribution = "company_only";
    }

    // Status: urgent without waiver needs payment before going live
    const status = isUrgent && !waive_fee ? "pending_payment" : "submitted";

    // SLA deadline for urgent bulletins (40 hours from now)
    const sla_deadline = isUrgent
      ? new Date(Date.now() + 40 * 60 * 60 * 1000).toISOString()
      : null;

    // Validate and cap image_urls
    const sanitisedImages = Array.isArray(image_urls)
      ? image_urls.slice(0, 3).filter((u: unknown) => typeof u === "string" && u.startsWith("http"))
      : [];

    // Insert bulletin
    const { data: bulletin, error: bulletinError } = await supabaseAdmin
      .from("bulletins")
      .insert({
        company_id: company.id,
        created_by_user_id: company.supabase_user_id,
        title,
        category,
        date_observed: date_observed || null,
        description,
        why_it_matters: why_it_matters || null,
        mitigation_message,
        driver_action: driver_action || null,
        urgency: urgency || "standard",
        distribution: effectiveDistribution,
        audience_type: audience_type || "all",
        audience_ids: audience_ids || null,
        confidential: confidential !== false,
        supporting_file_url: supporting_file_url || null,
        image_urls: sanitisedImages.length > 0 ? sanitisedImages : null,
        waive_fee: waive_fee === true,
        status,
        sla_deadline,
      })
      .select()
      .single();

    if (bulletinError) throw bulletinError;

    // Store understanding questions if provided
    if (understanding_questions?.length > 0) {
      await supabaseAdmin
        .from("bulletins")
        .update({
          driver_action: JSON.stringify({ driver_action, understanding_questions }),
        })
        .eq("id", bulletin.id);
    }

    // If contributing to CPD library (standard always, or urgent with waiver),
    // create a library entry with status "pending_review" for GFA admin approval
    if (effectiveDistribution === "cpd_library" || effectiveDistribution === "both") {
      await supabaseAdmin.from("cpd_library_items").insert({
        bulletin_id: bulletin.id,
        company_id: confidential ? null : company.id,
        title,
        category,
        description,
        why_relevant: why_it_matters || null,
        source_company_name: confidential ? null : company.name,
        shared_anonymously: confidential === true,
        image_urls: sanitisedImages.length > 0 ? sanitisedImages : null,
        status: "pending_review",
        is_urgent_contribution: isUrgent && waive_fee === true,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      bulletin_id: bulletin.id,
      urgency: bulletin.urgency,
      distribution: effectiveDistribution,
      status: bulletin.status,
      sla_deadline: bulletin.sla_deadline,
      needs_payment: status === "pending_payment",
    });
  } catch (err: any) {
    console.error("[bulletin/submit]", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
