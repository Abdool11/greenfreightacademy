import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | GreenFreightAcademy",
  description: "Privacy Policy for GreenFreightAcademy — how we collect, use, and protect your information.",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "4rem 2rem", fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", marginBottom: "0.5rem" }}>Privacy Policy</h1>
      <p style={{ color: "#94a3b8", marginBottom: "2.5rem", fontSize: "0.9rem" }}>Last updated: January 2025</p>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2ecc71", marginBottom: "0.75rem" }}>1. Who we are</h2>
        <p style={{ lineHeight: 1.7, color: "#cbd5e1" }}>
          GreenFreightAcademy is operated by Transport Action Group (Pty) Ltd, Registration No. K2021/8073/07, incorporated in South Africa. We are South Africa&apos;s specialist capability platform for the road freight sector.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2ecc71", marginBottom: "0.75rem" }}>2. Information we collect</h2>
        <p style={{ lineHeight: 1.7, color: "#cbd5e1" }}>
          We collect information you provide directly to us when you register a company account, enrol drivers, submit enquiries, or use our platform. This includes company name, contact details, driver names and contact information, and training progress data. We also collect usage data through standard web analytics.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2ecc71", marginBottom: "0.75rem" }}>3. How we use your information</h2>
        <p style={{ lineHeight: 1.7, color: "#cbd5e1" }}>
          We use the information we collect to provide and improve our training platform, process enrolments and payments, send training communications and CPD bulletins to enrolled drivers, generate progress reports for company accounts, and respond to enquiries. We do not sell your personal information to third parties.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2ecc71", marginBottom: "0.75rem" }}>4. Data storage and security</h2>
        <p style={{ lineHeight: 1.7, color: "#cbd5e1" }}>
          Your data is stored securely using Supabase infrastructure hosted in South Africa or the nearest available region. We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2ecc71", marginBottom: "0.75rem" }}>5. Your rights</h2>
        <p style={{ lineHeight: 1.7, color: "#cbd5e1" }}>
          Under the Protection of Personal Information Act (POPIA), you have the right to access, correct, or request deletion of your personal information. To exercise these rights, contact us at <a href="mailto:info@greenfreightacademy.co.za" style={{ color: "#2ecc71" }}>info@greenfreightacademy.co.za</a>.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2ecc71", marginBottom: "0.75rem" }}>6. Contact</h2>
        <p style={{ lineHeight: 1.7, color: "#cbd5e1" }}>
          For any privacy-related queries, contact Transport Action Group (Pty) Ltd at <a href="mailto:info@greenfreightacademy.co.za" style={{ color: "#2ecc71" }}>info@greenfreightacademy.co.za</a>.
        </p>
      </section>
    </main>
  );
}
