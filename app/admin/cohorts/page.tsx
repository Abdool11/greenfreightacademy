export const dynamic = "force-dynamic";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import CohortApprovalActions from "./CohortApprovalActions";

export default async function AdminCohortsPage() {
  await requireAdminSession();

  const { data: deployments } = await supabaseAdmin
    .from("deployments")
    .select(`
      id, approval_status, payment_method, payment_reference, payment_amount,
      payment_confirmed_at, approved_at, magic_links_sent_at, magic_links_sent_count,
      created_at,
      companies(id, name, contact_email)
    `)
    .order("created_at", { ascending: false });

  const statusLabel: Record<string, { label: string; color: string }> = {
    pending_payment: { label: "Pending Payment", color: "bg-amber-500/20 text-amber-400" },
    payment_received: { label: "Payment Received", color: "bg-blue-500/20 text-blue-400" },
    approved: { label: "Approved", color: "bg-[#2ecc71]/20 text-[#2ecc71]" },
    live: { label: "Live", color: "bg-green-500/20 text-green-400" },
    completed: { label: "Completed", color: "bg-slate-500/20 text-slate-400" },
    cancelled: { label: "Cancelled", color: "bg-red-500/20 text-red-400" },
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <nav className="bg-[#111f3a] border-b border-slate-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-slate-400 hover:text-white text-sm">← Dashboard</Link>
          <span className="text-slate-600">/</span>
          <span className="text-white text-sm font-medium">Cohort Approvals</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Cohort Approvals</h1>
          <p className="text-slate-400 text-sm mt-1">
            Review payment confirmations and approve cohorts to go live
          </p>
        </div>

        {/* Approval workflow legend */}
        <div className="bg-[#111f3a] border border-slate-700/50 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-slate-400 font-medium">Workflow:</span>
            {["pending_payment", "payment_received", "approved", "live", "completed"].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full ${statusLabel[s]?.color}`}>
                  {statusLabel[s]?.label}
                </span>
                {i < arr.length - 1 && <span className="text-slate-600">→</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {(deployments ?? []).map((d) => {
            const company = (d.companies as unknown) as Record<string, string> | null;
            const status = statusLabel[d.approval_status] ?? { label: d.approval_status, color: "bg-slate-500/20 text-slate-400" };

            return (
              <div key={d.id} className="bg-[#111f3a] border border-slate-700/50 rounded-xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold">{company?.name ?? "Unknown Company"}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="text-slate-400 text-sm">{company?.contact_email}</div>
                    <div className="text-slate-500 text-xs mt-1">
                      Submitted {new Date(d.created_at).toLocaleDateString("en-ZA")}
                    </div>

                    {/* Payment info */}
                    {d.payment_reference && (
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Method: </span>
                          <span className="text-white capitalize">{d.payment_method}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Reference: </span>
                          <span className="text-white font-mono">{d.payment_reference}</span>
                        </div>
                        {d.payment_amount && (
                          <div>
                            <span className="text-slate-500">Amount: </span>
                            <span className="text-[#2ecc71] font-semibold">
                              R {Number(d.payment_amount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {d.magic_links_sent_at && (
                      <div className="mt-2 text-xs text-slate-500">
                        Magic links sent to {d.magic_links_sent_count} driver(s) on{" "}
                        {new Date(d.magic_links_sent_at).toLocaleDateString("en-ZA")}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <CohortApprovalActions
                    deploymentId={d.id}
                    currentStatus={d.approval_status}
                  />
                </div>
              </div>
            );
          })}

          {(deployments ?? []).length === 0 && (
            <div className="text-center py-16 text-slate-500">
              No cohorts found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
