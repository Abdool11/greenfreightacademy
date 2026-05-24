import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | GreenFreightAcademy",
  description: "Terms of Use for GreenFreightAcademy — the conditions governing use of our platform.",
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "4rem 2rem", fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", marginBottom: "0.5rem" }}>Terms of Use</h1>
      <p style={{ color: "#94a3b8", marginBottom: "2.5rem", fontSize: "0.9rem" }}>Last updated: January 2025</p>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2ecc71", marginBottom: "0.75rem" }}>1. Acceptance of terms</h2>
        <p style={{ lineHeight: 1.7, color: "#cbd5e1" }}>
          By accessing or using the GreenFreightAcademy platform, you agree to be bound by these Terms of Use. If you do not agree to these terms, do not use the platform. These terms apply to all users including company account holders, enrolled drivers, and visitors.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2ecc71", marginBottom: "0.75rem" }}>2. Platform use</h2>
        <p style={{ lineHeight: 1.7, color: "#cbd5e1" }}>
          The GreenFreightAcademy platform is provided for the purpose of professional training, certification, and continuous development in the road freight sector. You agree to use the platform only for lawful purposes and in accordance with these terms. You must not misuse the platform, attempt to gain unauthorised access, or interfere with its operation.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2ecc71", marginBottom: "0.75rem" }}>3. Company accounts</h2>
        <p style={{ lineHeight: 1.7, color: "#cbd5e1" }}>
          Company account holders are responsible for the accuracy of information provided during registration, the management of their driver lists and enrolments, and ensuring that enrolled drivers are aware of and consent to participation. The company account holder is responsible for all activity conducted under their account.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2ecc71", marginBottom: "0.75rem" }}>4. Payment and cancellation</h2>
        <p style={{ lineHeight: 1.7, color: "#cbd5e1" }}>
          Monthly driver programme subscriptions are billed monthly with an initial 24-month agreement, thereafter month to month. Once-off programme fees are charged on enrolment. Cancellation requests must be submitted in writing with 30 days notice. Refunds are not provided for partially used subscription periods.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2ecc71", marginBottom: "0.75rem" }}>5. Intellectual property</h2>
        <p style={{ lineHeight: 1.7, color: "#cbd5e1" }}>
          All content on the GreenFreightAcademy platform, including training materials, programme content, publications, and CPD bulletins, is the intellectual property of Transport Action Group (Pty) Ltd or its licensors. You may not reproduce, distribute, or create derivative works without written permission.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2ecc71", marginBottom: "0.75rem" }}>6. Limitation of liability</h2>
        <p style={{ lineHeight: 1.7, color: "#cbd5e1" }}>
          To the maximum extent permitted by law, Transport Action Group (Pty) Ltd shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform. The platform is provided &quot;as is&quot; without warranties of any kind.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2ecc71", marginBottom: "0.75rem" }}>7. Governing law</h2>
        <p style={{ lineHeight: 1.7, color: "#cbd5e1" }}>
          These terms are governed by the laws of the Republic of South Africa. Any disputes shall be subject to the jurisdiction of the South African courts.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2ecc71", marginBottom: "0.75rem" }}>8. Contact</h2>
        <p style={{ lineHeight: 1.7, color: "#cbd5e1" }}>
          For any queries regarding these terms, contact Transport Action Group (Pty) Ltd at <a href="mailto:info@greenfreightacademy.co.za" style={{ color: "#2ecc71" }}>info@greenfreightacademy.co.za</a>.
        </p>
      </section>
    </main>
  );
}
