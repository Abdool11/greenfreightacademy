import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/admin/data — fetch summary counts for data management
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const [companies, drivers, quotes, invitations, leads] = await Promise.all([
    supabaseAdmin.from("companies").select("id, name, account_type, created_at", { count: "exact" }),
    supabaseAdmin.from("drivers").select("id, first_name, last_name, activation_status, created_at", { count: "exact" }),
    supabaseAdmin.from("quotes").select("id, reference, status, total, created_at", { count: "exact" }),
    supabaseAdmin.from("driver_invitations").select("id, activated_at, expires_at, created_at", { count: "exact" }),
    supabaseAdmin.from("prospect_leads").select("id, company_name, stage, created_at", { count: "exact" }),
  ]);

  return NextResponse.json({
    counts: {
      companies: companies.count ?? 0,
      drivers: drivers.count ?? 0,
      quotes: quotes.count ?? 0,
      invitations: invitations.count ?? 0,
      leads: leads.count ?? 0,
    },
    samples: {
      companies: (companies.data ?? []).slice(0, 10),
      drivers: (drivers.data ?? []).slice(0, 10),
    },
  });
}

// DELETE /api/admin/data — delete specific records or purge test data
export async function DELETE(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { action, ids, table } = await req.json();

  // Safety: only allow deleting from permitted tables
  const ALLOWED_TABLES = ["companies", "drivers", "quotes", "driver_invitations", "prospect_leads", "enrolments"];
  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: "Table not permitted for deletion" }, { status: 403 });
  }

  if (action === "delete_by_ids") {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }

    // Cascade: if deleting a company, also delete its drivers and quotes
    if (table === "companies") {
      for (const companyId of ids) {
        // Delete related drivers
        const { data: companyDrivers } = await supabaseAdmin
          .from("drivers")
          .select("id")
          .eq("company_id", companyId);
        const driverIds = (companyDrivers ?? []).map((d: { id: string }) => d.id);
        if (driverIds.length > 0) {
          await supabaseAdmin.from("enrolments").delete().in("driver_id", driverIds);
          await supabaseAdmin.from("driver_invitations").delete().in("driver_id", driverIds);
          await supabaseAdmin.from("drivers").delete().in("id", driverIds);
        }
        // Delete related quotes
        await supabaseAdmin.from("quotes").delete().eq("company_id", companyId);
      }
    }

    const { error } = await supabaseAdmin.from(table).delete().in("id", ids);
    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json({ error: "Delete failed: " + error.message }, { status: 500 });
    }

    // Audit log
    supabaseAdmin.from("admin_audit_log").insert({
      admin_id: session.adminId,
      action: `delete_${table}`,
      target_type: table,
      target_id: ids.join(","),
      details: JSON.stringify({ count: ids.length }),
      created_at: new Date().toISOString(),
    }).then(() => {});

    return NextResponse.json({ ok: true, deleted: ids.length });
  }

  if (action === "purge_test_data") {
    // Delete companies/drivers with test/sample indicators in name
    const testPatterns = ["test", "sample", "demo", "dummy", "example"];
    let deletedCompanies = 0;

    for (const pattern of testPatterns) {
      const { data: testCompanies } = await supabaseAdmin
        .from("companies")
        .select("id")
        .ilike("name", `%${pattern}%`);

      if (testCompanies && testCompanies.length > 0) {
        const companyIds = testCompanies.map((c: { id: string }) => c.id);
        for (const companyId of companyIds) {
          const { data: companyDrivers } = await supabaseAdmin
            .from("drivers")
            .select("id")
            .eq("company_id", companyId);
          const driverIds = (companyDrivers ?? []).map((d: { id: string }) => d.id);
          if (driverIds.length > 0) {
            await supabaseAdmin.from("enrolments").delete().in("driver_id", driverIds);
            await supabaseAdmin.from("driver_invitations").delete().in("driver_id", driverIds);
            await supabaseAdmin.from("drivers").delete().in("id", driverIds);
          }
          await supabaseAdmin.from("quotes").delete().eq("company_id", companyId);
        }
        await supabaseAdmin.from("companies").delete().in("id", companyIds);
        deletedCompanies += companyIds.length;
      }
    }

    return NextResponse.json({ ok: true, deletedCompanies });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
