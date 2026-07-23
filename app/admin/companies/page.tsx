export const dynamic = "force-dynamic";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import AddCompanyForm from "./AddCompanyForm";
import CompaniesTable from "./CompaniesTable";

export default async function AdminCompaniesPage() {
  await requireAdminSession();

  const { data: companies } = await supabaseAdmin
    .from("companies")
    .select("id, name, contact_name, contact_email, contact_phone, account_type, subscription_status, trial_expires_at, created_at")
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
          <AddCompanyForm />
        </div>

        <CompaniesTable companies={companies ?? []} />
      </div>
    </div>
  );
}
