export const dynamic = "force-dynamic";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";

export default async function AdminCompaniesPage() {
  await requireAdminSession();

  const { data: companies } = await supabaseAdmin
    .from("companies")
    .select("id, name, contact_name, contact_email, contact_phone, account_type, status, trial_expires_at, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <nav className="bg-[#111f3a] border-b border-slate-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-slate-400 hover:text-white text-sm">← Dashboard</Link>
          <span className="text-slate-600">/</span>
          <span className="text-white text-sm font-medium">Companies</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Companies</h1>
            <p className="text-slate-400 text-sm mt-1">{companies?.length ?? 0} registered companies</p>
          </div>
        </div>

        <div className="bg-[#111f3a] border border-slate-700/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left text-slate-400 font-medium px-6 py-3">Company</th>
                <th className="text-left text-slate-400 font-medium px-6 py-3">Contact</th>
                <th className="text-left text-slate-400 font-medium px-6 py-3">Type</th>
                <th className="text-left text-slate-400 font-medium px-6 py-3">Status</th>
                <th className="text-left text-slate-400 font-medium px-6 py-3">Registered</th>
                <th className="text-left text-slate-400 font-medium px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(companies ?? []).map((c) => (
                <tr key={c.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{c.name}</div>
                    <div className="text-slate-500 text-xs">{c.contact_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-300">{c.contact_name ?? "—"}</div>
                    <div className="text-slate-500 text-xs">{c.contact_phone ?? "—"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.account_type === "trial"
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "bg-[#2ecc71]/20 text-[#2ecc71]"
                    }`}>
                      {c.account_type === "trial" ? "Trial" : "Full"}
                    </span>
                    {c.account_type === "trial" && c.trial_expires_at && (
                      <div className="text-slate-500 text-xs mt-0.5">
                        Expires {new Date(c.trial_expires_at).toLocaleDateString("en-ZA")}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString("en-ZA")}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/companies/${c.id}`}
                      className="text-[#2ecc71] hover:underline text-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(companies ?? []).length === 0 && (
            <div className="text-center py-12 text-slate-500">No companies registered yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
