import Link from "next/link";
import { ArrowRight, CheckCircle2, Info } from "lucide-react";
import { PROGRAMMES } from "@/lib/constants";

const launchProgramme = PROGRAMMES.find((programme) => programme.id === "ptdp");

export default function ProgrammesPage() {
  const programme = launchProgramme;

  if (!programme) return null;

  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
      <section style={{ padding: "5rem 0 4rem", background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container-gfa" style={{ maxWidth: "780px" }}>
          <span className="pill-badge pill-green" style={{ display: "inline-flex", marginBottom: "1rem" }}>Now enrolling</span>
          <h1 style={{ marginBottom: "1.25rem" }}>Professional Truck Driver Program</h1>
          <p style={{ maxWidth: "660px", fontSize: "1.0625rem", color: "var(--text-secondary)" }}>
            Foundational professional driver training for safer, more consistent road-freight operations.
          </p>
        </div>
      </section>

      <section style={{ padding: "4rem 0", background: "var(--color-slate-900)" }}>
        <div className="container-gfa" style={{ maxWidth: "900px" }}>
          <article style={{ padding: "2rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(34,197,94,0.24)", borderRadius: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              <div>
                <h2 style={{ fontSize: "1.4rem", margin: 0 }}>{programme.title}</h2>
                <p style={{ color: "var(--text-secondary)", margin: "0.75rem 0 0", maxWidth: "620px", lineHeight: 1.7 }}>{programme.fullDescription}</p>
              </div>
              <div style={{ padding: "0.65rem 0.9rem", borderRadius: "0.65rem", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "var(--color-green-400)", fontFamily: "var(--font-display)", fontWeight: 800, whiteSpace: "nowrap" }}>
                R299 once-off per driver
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", margin: "1.75rem 0" }}>
              <div style={{ padding: "1.25rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.025)" }}>
                <h3 style={{ fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.8rem" }}>What drivers gain</h3>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.65rem", padding: 0, margin: 0 }}>
                  {programme.outcomes.map((outcome) => (
                    <li key={outcome} style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      <CheckCircle2 size={15} style={{ color: "var(--color-green-400)", flexShrink: 0, marginTop: "0.15rem" }} />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ padding: "1.25rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.025)" }}>
                <h3 style={{ fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "0.8rem" }}>Launch terms</h3>
                <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.7, color: "var(--text-secondary)" }}>
                  The launch price is <strong style={{ color: "white" }}>R299 once-off per driver</strong>. There are no monthly programme fees. Payment is by EFT and training is deployed after finance confirms the payment.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.875rem", alignItems: "center", flexWrap: "wrap" }}>
              <Link href="/register" className="btn-primary">Register your company <ArrowRight size={16} /></Link>
              <Link href="/contact?type=enquiry" className="btn-secondary">Ask a question</Link>
            </div>
          </article>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginTop: "1.5rem", padding: "1rem 1.25rem", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.16)", borderRadius: "0.75rem" }}>
            <Info size={16} style={{ color: "var(--color-green-400)", flexShrink: 0, marginTop: "0.15rem" }} />
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              Additional GFA programmes, CPD and driver-briefing offerings are planned for later release. They are not open for sale or enrolment at this launch.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
