import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/admin/super?panel=sales|revenue|adoption|cohorts|cpd|incidents|paystack|eft
export async function GET(req: NextRequest) {
  const session = await requireSuperAdminSession();
  if (session instanceof Response) return session;

  const panel = req.nextUrl.searchParams.get("panel") ?? "sales";
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  try {
    if (panel === "sales") {
      const [
        { count: totalLeads },
        { count: totalVouchersSent },
        { count: totalActivated },
        { count: totalConverted },
        { data: recentLeads },
        { data: campaigns },
      ] = await Promise.all([
        supabaseAdmin.from("prospect_leads").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("prospect_leads").select("*", { count: "exact", head: true }).eq("stage", "voucher_sent"),
        supabaseAdmin.from("prospect_leads").select("*", { count: "exact", head: true }).in("stage", ["activated", "drivers_deployed", "converted"]),
        supabaseAdmin.from("prospect_leads").select("*", { count: "exact", head: true }).eq("stage", "converted"),
        supabaseAdmin.from("prospect_leads").select("company_name, contact_name, stage, created_at, last_activity_at").order("created_at", { ascending: false }).limit(10),
        supabaseAdmin.from("campaign_logs").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      const conversionRate = totalLeads ? Math.round(((totalConverted ?? 0) / (totalLeads ?? 1)) * 100) : 0;
      const activationRate = totalVouchersSent ? Math.round(((totalActivated ?? 0) / ((totalVouchersSent ?? 1) + (totalActivated ?? 0))) * 100) : 0;

      return NextResponse.json({
        totalLeads,
        totalVouchersSent,
        totalActivated,
        totalConverted,
        conversionRate,
        activationRate,
        recentLeads: recentLeads ?? [],
        campaigns: campaigns ?? [],
      });
    }

    if (panel === "revenue") {
      const [
        { data: paidQuotes },
        { data: eftQuotes },
        { data: paystackQuotes },
        { data: monthlyData },
        { data: courseRevenue },
      ] = await Promise.all([
        supabaseAdmin.from("quotes").select("total, paid_at, payment_method").eq("status", "paid"),
        supabaseAdmin.from("quotes").select("total, paid_at").eq("payment_method", "eft").eq("status", "paid"),
        supabaseAdmin.from("quotes").select("total, paid_at").eq("payment_method", "paystack").eq("status", "paid"),
        // Monthly revenue for last 12 months
        supabaseAdmin.from("quotes").select("total, paid_at").eq("status", "paid").gte("paid_at", yearStart.toISOString()).order("paid_at"),
        // Revenue by course
        supabaseAdmin.from("enrolments").select("course_id, courses(name, price_corporate), status").eq("status", "active"),
      ]);

      const totalRevenue = (paidQuotes ?? []).reduce((sum: number, q: Record<string, unknown>) => sum + (Number(q.total) || 0), 0);
      const eftRevenue = (eftQuotes ?? []).reduce((sum: number, q: Record<string, unknown>) => sum + (Number(q.total) || 0), 0);
      const paystackRevenue = (paystackQuotes ?? []).reduce((sum: number, q: Record<string, unknown>) => sum + (Number(q.total) || 0), 0);

      // Build monthly breakdown
      const monthlyMap: Record<string, number> = {};
      for (const q of (monthlyData ?? []) as Record<string, unknown>[]) {
        if (!q.paid_at) continue;
        const month = new Date(q.paid_at as string).toLocaleString("en-ZA", { month: "short", year: "2-digit" });
        monthlyMap[month] = (monthlyMap[month] ?? 0) + (Number(q.total) || 0);
      }

      return NextResponse.json({
        totalRevenue,
        eftRevenue,
        paystackRevenue,
        totalInvoices: (paidQuotes ?? []).length,
        monthlyBreakdown: Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount })),
        courseRevenue: courseRevenue ?? [],
      });
    }

    if (panel === "adoption") {
      const [
        { count: totalCompanies },
        { count: activeCompanies },
        { count: trialCompanies },
        { count: totalDrivers },
        { count: activeDrivers },
        { count: totalCerts },
        { data: companyGrowth },
        { data: topCompanies },
      ] = await Promise.all([
        supabaseAdmin.from("companies").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("companies").select("*", { count: "exact", head: true }).eq("status", "active").eq("account_type", "full"),
        supabaseAdmin.from("companies").select("*", { count: "exact", head: true }).eq("account_type", "trial"),
        supabaseAdmin.from("drivers").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("drivers").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabaseAdmin.from("certifications").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabaseAdmin.from("companies").select("created_at").gte("created_at", yearStart.toISOString()).order("created_at"),
        supabaseAdmin.from("companies").select("id, name, created_at, account_type").order("created_at", { ascending: false }).limit(10),
      ]);

      // Monthly company growth
      const growthMap: Record<string, number> = {};
      for (const c of (companyGrowth ?? []) as Record<string, unknown>[]) {
        const month = new Date(c.created_at as string).toLocaleString("en-ZA", { month: "short", year: "2-digit" });
        growthMap[month] = (growthMap[month] ?? 0) + 1;
      }

      return NextResponse.json({
        totalCompanies,
        activeCompanies,
        trialCompanies,
        totalDrivers,
        activeDrivers,
        totalCerts,
        companyGrowth: Object.entries(growthMap).map(([month, count]) => ({ month, count })),
        topCompanies: topCompanies ?? [],
      });
    }

    if (panel === "cohorts") {
      const [
        { data: deployments },
        { count: pendingCount },
        { count: activeCount },
        { count: completedCount },
        { data: recentDeployments },
      ] = await Promise.all([
        supabaseAdmin.from("deployments").select(`
          id, deployed_at, notes,
          companies(name),
          quotes(reference_number, total, status, line_items)
        `).order("deployed_at", { ascending: false }).limit(50),
        supabaseAdmin.from("quotes").select("*", { count: "exact", head: true }).eq("status", "eft_submitted"),
        supabaseAdmin.from("quotes").select("*", { count: "exact", head: true }).eq("status", "paid"),
        supabaseAdmin.from("enrolments").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabaseAdmin.from("deployments").select(`
          id, deployed_at,
          companies(name),
          quotes(reference_number, total, status)
        `).order("deployed_at", { ascending: false }).limit(10),
      ]);

      return NextResponse.json({
        pendingPayment: pendingCount ?? 0,
        activeCohorts: activeCount ?? 0,
        completedCohorts: completedCount ?? 0,
        totalDeployments: (deployments ?? []).length,
        recentDeployments: recentDeployments ?? [],
      });
    }

    if (panel === "cpd") {
      const [
        { data: modules },
        { count: totalParticipants },
        { count: completedParticipants },
        { data: moduleStats },
        { data: libraryItems },
      ] = await Promise.all([
        supabaseAdmin.from("cpd_modules").select("*").order("created_at", { ascending: false }),
        supabaseAdmin.from("driver_cpd_participation").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("driver_cpd_participation").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabaseAdmin.from("driver_cpd_participation").select("cpd_module_id, status").order("cpd_module_id"),
        supabaseAdmin.from("cpd_library").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      const completionRate = totalParticipants ? Math.round(((completedParticipants ?? 0) / (totalParticipants ?? 1)) * 100) : 0;

      // Per-module completion stats
      const moduleCompletionMap: Record<string, { total: number; completed: number }> = {};
      for (const p of (moduleStats ?? []) as Record<string, unknown>[]) {
        const mid = p.cpd_module_id as string;
        if (!moduleCompletionMap[mid]) moduleCompletionMap[mid] = { total: 0, completed: 0 };
        moduleCompletionMap[mid].total++;
        if (p.status === "completed") moduleCompletionMap[mid].completed++;
      }

      return NextResponse.json({
        totalModules: (modules ?? []).length,
        publishedModules: (modules ?? []).filter((m: Record<string, unknown>) => m.status === "published").length,
        totalParticipants,
        completedParticipants,
        completionRate,
        modules: modules ?? [],
        libraryItems: libraryItems ?? [],
        moduleCompletionMap,
      });
    }

    if (panel === "incidents") {
      const [
        { data: bulletins },
        { count: totalBulletins },
        { count: internalBulletins },
        { count: industryCpdBulletins },
        { data: recentBulletins },
        { data: campaigns },
      ] = await Promise.all([
        supabaseAdmin.from("bulletins").select(`
          id, title, category, urgency, scope, status, created_at,
          companies(name)
        `).order("created_at", { ascending: false }).limit(50),
        supabaseAdmin.from("bulletins").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("bulletins").select("*", { count: "exact", head: true }).eq("scope", "internal"),
        supabaseAdmin.from("bulletins").select("*", { count: "exact", head: true }).eq("scope", "industry"),
        supabaseAdmin.from("bulletins").select(`
          id, title, category, urgency, scope, status, created_at,
          companies(name)
        `).order("created_at", { ascending: false }).limit(10),
        supabaseAdmin.from("bulletin_campaigns").select("total_targeted, total_delivered, total_acknowledged, total_check_completed").gte("created_at", thirtyDaysAgo.toISOString()),
      ]);

      const totalTargeted = (campaigns ?? []).reduce((s: number, c: Record<string, unknown>) => s + (Number(c.total_targeted) || 0), 0);
      const totalDelivered = (campaigns ?? []).reduce((s: number, c: Record<string, unknown>) => s + (Number(c.total_delivered) || 0), 0);
      const totalAcknowledged = (campaigns ?? []).reduce((s: number, c: Record<string, unknown>) => s + (Number(c.total_acknowledged) || 0), 0);

      // Category breakdown
      const categoryMap: Record<string, number> = {};
      for (const b of (bulletins ?? []) as Record<string, unknown>[]) {
        const cat = b.category as string;
        categoryMap[cat] = (categoryMap[cat] ?? 0) + 1;
      }

      return NextResponse.json({
        totalBulletins,
        internalBulletins,
        industryCpdBulletins,
        totalTargeted,
        totalDelivered,
        totalAcknowledged,
        deliveryRate: totalTargeted ? Math.round((totalDelivered / totalTargeted) * 100) : 0,
        acknowledgementRate: totalDelivered ? Math.round((totalAcknowledged / totalDelivered) * 100) : 0,
        categoryBreakdown: Object.entries(categoryMap).map(([cat, count]) => ({ cat, count })),
        recentBulletins: recentBulletins ?? [],
      });
    }

    if (panel === "paystack") {
      const [
        { data: paystackPayments },
        { data: recentPaystack },
      ] = await Promise.all([
        supabaseAdmin.from("quotes").select("id, reference_number, total, paid_at, companies(name)").eq("payment_method", "paystack").eq("status", "paid").order("paid_at", { ascending: false }),
        supabaseAdmin.from("quotes").select("id, reference_number, total, paid_at, companies(name)").eq("payment_method", "paystack").eq("status", "paid").order("paid_at", { ascending: false }).limit(20),
      ]);

      const totalPaystack = (paystackPayments ?? []).reduce((s: number, q: Record<string, unknown>) => s + (Number(q.total) || 0), 0);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthPaystack = (paystackPayments ?? [])
        .filter((q: Record<string, unknown>) => q.paid_at && new Date(q.paid_at as string) >= thisMonthStart)
        .reduce((s: number, q: Record<string, unknown>) => s + (Number(q.total) || 0), 0);

      return NextResponse.json({
        totalPaystackRevenue: totalPaystack,
        thisMonthPaystack,
        totalTransactions: (paystackPayments ?? []).length,
        recentTransactions: recentPaystack ?? [],
      });
    }

    if (panel === "eft") {
      const [
        { data: eftPaid },
        { data: eftPending },
        { data: recentEft },
      ] = await Promise.all([
        supabaseAdmin.from("quotes").select("id, reference_number, total, paid_at, eft_reference, companies(name)").eq("payment_method", "eft").eq("status", "paid").order("paid_at", { ascending: false }),
        supabaseAdmin.from("quotes").select("id, reference_number, total, eft_submitted_at, eft_reference, companies(name)").eq("status", "eft_submitted").order("eft_submitted_at", { ascending: false }),
        supabaseAdmin.from("quotes").select("id, reference_number, total, paid_at, eft_submitted_at, eft_reference, status, companies(name)").in("status", ["paid", "eft_submitted"]).eq("payment_method", "eft").order("created_at", { ascending: false }).limit(20),
      ]);

      const totalEftRevenue = (eftPaid ?? []).reduce((s: number, q: Record<string, unknown>) => s + (Number(q.total) || 0), 0);
      const pendingEftValue = (eftPending ?? []).reduce((s: number, q: Record<string, unknown>) => s + (Number(q.total) || 0), 0);

      return NextResponse.json({
        totalEftRevenue,
        pendingEftValue,
        totalEftTransactions: (eftPaid ?? []).length,
        pendingEftCount: (eftPending ?? []).length,
        recentTransactions: recentEft ?? [],
      });
    }

    if (panel === "bulletin_revenue") {
      const [
        { data: allPayments },
        { data: recentPayments },
      ] = await Promise.all([
        supabaseAdmin.from("bulletin_payments").select("amount, method, status, created_at"),
        supabaseAdmin.from("bulletin_payments").select("id, amount, method, status, created_at, companies(name)").order("created_at", { ascending: false }).limit(20),
      ]);
      const paid = (allPayments ?? []).filter((p: Record<string, unknown>) => p.status === "paid");
      const totalRevenue = paid.reduce((s: number, p: Record<string, unknown>) => s + (Number(p.amount) || 0), 0);
      const cardRevenue = paid.filter((p: Record<string, unknown>) => p.method === "card").reduce((s: number, p: Record<string, unknown>) => s + (Number(p.amount) || 0), 0);
      const invoiceRevenue = paid.filter((p: Record<string, unknown>) => p.method === "invoice").reduce((s: number, p: Record<string, unknown>) => s + (Number(p.amount) || 0), 0);
      const pendingInvoiceRevenue = (allPayments ?? []).filter((p: Record<string, unknown>) => p.status === "pending" && p.method === "invoice").reduce((s: number, p: Record<string, unknown>) => s + (Number(p.amount) || 0), 0);
      const waivedCount = (allPayments ?? []).filter((p: Record<string, unknown>) => p.status === "waived").length;
      return NextResponse.json({
        totalRevenue,
        cardRevenue,
        invoiceRevenue,
        pendingInvoiceRevenue,
        totalPaidCount: paid.length,
        waivedCount,
        recentPayments: recentPayments ?? [],
      });
    }

    return NextResponse.json({ error: "Unknown panel" }, { status: 400 });
  } catch (err) {
    console.error("[CEO Dashboard Error]", err);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
