import Link from "next/link";
import { ArrowRight, CheckCircle2, Info, Play } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { PROGRAMMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type CoursePricing = {
  id: string;
  name: string;
  slug: string;
  price_corporate: number | string | null;
  price_individual: number | string | null;
  description: string | null;
};

const formatZar = (value: number | string | null | undefined) => {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
};

function programmeCopy(slug: string) {
  return PROGRAMMES.find((programme) => programme.slug === slug);
}

export default async function PricingPage() {
  const bookHref = "/register";
  const bookLabel = "Book for your company";
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id, name, slug, price_corporate, price_individual, description")
    .eq("available", true)
    .order("name");

  const courses = (data ?? []) as CoursePricing[];

  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
      <section
        style={{
          padding: "5rem 0 4rem",
          background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="container-gfa" style={{ textAlign: "center" }}>
          <h1 style={{ maxWidth: "660px", margin: "0 auto 1.25rem" }}>Pricing that supports fleet-wide rollout</h1>
          <p style={{ maxWidth: "620px", margin: "0 auto 1rem", fontSize: "1.0625rem", color: "var(--text-secondary)" }}>
            Green Freight Academy is designed to make structured capability development practical to deploy across your fleet.
            The prices below are managed from the same approved course catalogue used for quotations.
          </p>
          <p style={{ maxWidth: "560px", margin: "0 auto", fontSize: "0.9375rem", color: "var(--text-muted)" }}>
            Request a quotation for your selected drivers, programmes and commercial terms.
          </p>
        </div>
      </section>

      <section style={{ padding: "4rem 0", background: "var(--color-slate-900)" }}>
        <div className="container-gfa">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "end", flexWrap: "wrap", marginBottom: "2.25rem" }}>
            <div>
              <h2 style={{ marginBottom: "0.6rem" }}>Available programmes</h2>
              <p style={{ maxWidth: "620px", color: "var(--text-secondary)", margin: 0 }}>
                Corporate pricing is shown per available programme. Individual pricing is provided where that enrolment route is available.
              </p>
            </div>
            <Link href={bookHref} className="btn-primary" style={{ fontSize: "0.875rem" }}>
              {bookLabel}<ArrowRight size={16} />
            </Link>
          </div>

          {error ? (
            <div style={{ padding: "1.25rem", border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)", borderRadius: "0.75rem", color: "#fde68a" }}>
              Pricing is temporarily unavailable. Please contact the GFA team for an approved quotation.
            </div>
          ) : courses.length === 0 ? (
            <div style={{ padding: "1.25rem", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", borderRadius: "0.75rem", color: "var(--text-secondary)" }}>
              No public programme pricing is currently available. Please contact GFA for a quotation.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "1.25rem" }}>
              {courses.map((course) => {
                const copy = programmeCopy(course.slug);
                const corporatePrice = Number(course.price_corporate ?? 0);
                const individualPrice = Number(course.price_individual ?? 0);
                return (
                  <article key={course.id} style={{ padding: "1.75rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "1rem", display: "flex", flexDirection: "column" }}>
                    <h3 style={{ fontSize: "1.125rem", marginBottom: "0.65rem" }}>{course.name}</h3>
                    <p style={{ minHeight: "3.5rem", fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
                      {course.description || copy?.shortDescription || "Structured capability development for road-freight teams."}
                    </p>
                    <div style={{ padding: "1rem", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)", borderRadius: "0.75rem", marginBottom: "1.25rem" }}>
                      <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Corporate programme price</div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2rem", color: "var(--color-green-400)", lineHeight: 1 }}>{formatZar(corporatePrice)}</div>
                      {individualPrice > 0 && <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginTop: "0.45rem" }}>Individual enrolment from {formatZar(individualPrice)}</div>}
                    </div>
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem", margin: "0 0 1.5rem", padding: 0 }}>
                      {["Structured learning content", "Progress visibility for management", "Completion and evidence context"].map((item) => (
                        <li key={item} style={{ display: "flex", gap: "0.45rem", fontSize: "0.84rem", color: "var(--text-secondary)" }}><CheckCircle2 size={14} style={{ color: "var(--color-green-400)", marginTop: "0.15rem", flexShrink: 0 }} />{item}</li>
                      ))}
                    </ul>
                    <div style={{ marginTop: "auto", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <Link href={bookHref} className="btn-primary" style={{ fontSize: "0.84rem" }}>{bookLabel}</Link>
                      {individualPrice > 0 && <Link href={`/contact?type=individual-learner&programme=${course.slug}`} className="btn-secondary" style={{ fontSize: "0.84rem" }}>Individual enquiry</Link>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.75rem", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
            <Info size={16} style={{ color: "var(--color-green-400)", marginTop: "0.15rem", flexShrink: 0 }} />
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: "white" }}>Commercial confirmation:</strong> The approved quotation remains the authoritative commercial record for your cohort, selected programmes, seats, VAT treatment and payment terms.
            </p>
          </div>
        </div>
      </section>

      <section style={{ padding: "5rem 0", background: "linear-gradient(135deg, #0f1f3d 0%, #0a1628 100%)", borderTop: "1px solid var(--border-subtle)", textAlign: "center" }}>
        <div className="container-gfa">
          <h2 style={{ maxWidth: "560px", margin: "0 auto 1.25rem" }}>Ready to plan your first cohort?</h2>
          <p style={{ maxWidth: "500px", margin: "0 auto 2.5rem", color: "var(--text-secondary)" }}>Register your company to prepare your driver list and request a controlled commercial quotation.</p>
          <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={bookHref} className="btn-primary">{bookLabel}<ArrowRight size={16} /></Link>
            <Link href="/demo" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Play size={15} /> Take a guided tour</Link>
            <Link href="/contact" className="btn-secondary">Contact us</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
