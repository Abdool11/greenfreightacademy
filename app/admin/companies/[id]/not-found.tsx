import Link from "next/link";

export default function CompanyNotFound() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a1628", color: "#f9fafb" }}>
      <nav style={{ background: "#111f3a", borderBottom: "1px solid rgba(100,116,139,0.3)", padding: "1rem 1.5rem" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <Link href="/admin/companies" style={{ color: "#94a3b8", fontSize: "0.875rem", textDecoration: "none" }}>
            ← Companies
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "6rem 1.5rem", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "5rem", color: "var(--color-green-400, #4ade80)", lineHeight: 1, marginBottom: "1rem" }}>
          404
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>Company not found</h1>
        <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
          The client/company you are trying to load does not exist or has been removed.
        </p>
        <Link
          href="/admin/companies"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "#22c55e",
            color: "#000",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Return to Companies
        </Link>
      </div>
    </div>
  );
}
