"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Filter } from "lucide-react";

interface CompanyRow {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  account_type: string;
  subscription_status: string;
  trial_expires_at: string | null;
  created_at: string;
}

type SortKey = "name" | "contact_name" | "account_type" | "subscription_status" | "created_at";
type SortDir = "asc" | "desc";

export default function CompaniesTable({ companies }: { companies: CompanyRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const statusOptions = useMemo(() => {
    const set = new Set(companies.map(c => c.subscription_status).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [companies]);

  const typeOptions = useMemo(() => {
    const set = new Set(companies.map(c => c.account_type).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [companies]);

  const filtered = useMemo(() => {
    let result = [...companies];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.contact_name?.toLowerCase().includes(q) ||
        c.contact_email?.toLowerCase().includes(q) ||
        c.contact_phone?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(c => c.subscription_status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter(c => c.account_type === typeFilter);
    }

    // Sort
    result.sort((a, b) => {
      let valA: string | number = a[sortKey] ?? "";
      let valB: string | number = b[sortKey] ?? "";
      if (sortKey === "created_at") {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [companies, search, sortKey, sortDir, statusFilter, typeFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="inline ml-1 w-3 h-3 text-slate-600" />;
    return sortDir === "asc"
      ? <ArrowUp className="inline ml-1 w-3 h-3 text-[#2ecc71]" />
      : <ArrowDown className="inline ml-1 w-3 h-3 text-[#2ecc71]" />;
  };

  const selectClass = "bg-[#0a1628] border border-slate-700/50 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#2ecc71]/50 cursor-pointer";

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, contact, email, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0a1628] border border-slate-700/50 text-white text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-[#2ecc71]/50 placeholder:text-slate-600"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={selectClass}
          >
            {statusOptions.map(s => (
              <option key={s} value={s}>{s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className={selectClass}
        >
          {typeOptions.map(t => (
            <option key={t} value={t}>{t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>

        {/* Result count */}
        <span className="text-slate-500 text-xs ml-auto">
          {filtered.length} of {companies.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-[#111f3a] border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th
                className="text-left text-slate-400 font-medium px-6 py-3 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleSort("name")}
              >
                Company <SortIcon column="name" />
              </th>
              <th
                className="text-left text-slate-400 font-medium px-6 py-3 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleSort("contact_name")}
              >
                Contact <SortIcon column="contact_name" />
              </th>
              <th
                className="text-left text-slate-400 font-medium px-6 py-3 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleSort("account_type")}
              >
                Type <SortIcon column="account_type" />
              </th>
              <th
                className="text-left text-slate-400 font-medium px-6 py-3 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleSort("subscription_status")}
              >
                Status <SortIcon column="subscription_status" />
              </th>
              <th
                className="text-left text-slate-400 font-medium px-6 py-3 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleSort("created_at")}
              >
                Registered <SortIcon column="created_at" />
              </th>
              <th className="text-left text-slate-400 font-medium px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
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
                    c.subscription_status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    {c.subscription_status ?? "active"}
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
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            {companies.length === 0 ? "No companies registered yet" : "No companies match your search"}
          </div>
        )}
      </div>
    </div>
  );
}
