/**
 * GreenFreightAcademy — Publications
 * Books, conference papers, and published articles by Abdool Kamdar.
 */
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Publications",
  description:
    "A curated collection of books, articles, and conference papers supporting TAG’s work in Green Freight transformation, road freight efficiency, emissions reduction, electric truck transition, and professional driver development. Books are available to order to support online e-learning, and can also be branded with your corporate ID and keynote message.",
};

const BOOKS = [
  {
    title: "The Professional Truck Driver's Handbook",
    subtitle: "A Complete Guide to Professional Excellence in Road Freight",
    author: "Abdool Kamdar and Nicci Scott-Anderson",
    description:
      "A comprehensive step-by-step guide to professional excellence in road freight. Covers the full range of knowledge and skills required for professional drivers — from road safety and vehicle management through to eco-driving, cargo handling, and the emerging requirements of electric truck operation.",
    image: "/book-truck-driver-handbook.png",
    year: "2025",
  },
  {
    title: "The Professional Truck Driver's Handbook",
    subtitle: "2026 Edition — Including Electric Trucks",
    author: "Abdool Kamdar and Nicci Scott-Anderson",
    description:
      "A comprehensive step-by-step guide to professional excellence in road freight. Covers the full range of knowledge and skills required for professional drivers — from road safety and vehicle management through to eco-driving, cargo handling, and the emerging requirements of electric truck operation. The 2026 edition includes a new chapter on electric trucks. Foreword by Dr. John Deng Diar Diing, Executive Secretary, Northern Corridor Transit and Transport Coordination Authority (NCTTCA).",
    image: "/book-truck-driver-handbook-2026.webp",
    year: "2026",
  },
  {
    title: "Road Freight Sustainability 4.0",
    subtitle: "Reducing CO\u2082 Emissions While Improving Profit \u2014 South African Edition",
    author: "A K Kamdar",
    description:
      "A practical guide for South African fleet operators and freight managers on how to reduce emissions while simultaneously improving operational profitability. Covers the full sustainability toolkit \u2014 from driver behaviour and eco-driving to telematics, target-setting, and green procurement. Demonstrates that a green fleet is a more profitable fleet.",
    image: "/book-road-freight-sustainability.png",
    year: "2020",
  },
  {
    title: "Driving Profit with Power",
    subtitle: "Making the electric transition work for you",
    author: "Abdool Kamdar",
    description:
      "A practical guide to making the transition to electric trucks commercially viable. Covers total cost of ownership analysis, route and duty-cycle assessment, charging pathway selection, battery swapping, fleet transition planning, and the operational and management skills required to run a profitable electric fleet. Built on the principle that the electric transition must be predicated on achieving the same or better profit performance than diesel.",
    image: "/book-driving-profit-with-power.png",
    year: "Due Late 2026",
  },
];

const PAPERS = [
  {
    title: "Decarbonisation of Road Freight: Electrification of Heavy Vehicles",
    venue: "EVIA \u2014 Expert's Opinion",
    year: "2018",
    summary:
      "An early published article examining the role of electric heavy vehicles in freight decarbonisation, including transition constraints, infrastructure questions, and the long-term logic of electrification in road freight. Based on a presentation at the Electric Vehicle Industry Association Conference at Nelson Mandela University in 2018.",
  },
  {
    title: "Perceptions of the Road Transport Management System (RTMS): Promoting Voluntary Certification",
    venue: "SATC Conference Paper",
    year: "2017",
    summary:
      "A conference paper examining stakeholder perceptions of RTMS and the role of voluntary certification in improving safety, compliance, and operational performance in road freight.",
  },
  {
    title: "Ultracapacitor Kinetic Energy Recovery Systems in Road Transport Vehicles: Is it a Viable Retrofit Option for Reducing Fuel Consumption and CO\u2082 Emissions?",
    venue: "SATC Conference Paper",
    year: "2017",
    summary:
      "A conference paper exploring retrofit energy-recovery options for reducing fuel consumption and CO\u2082 emissions in road transport operations.",
  },
  {
    title: "Operational Improvement Outcomes through Voluntary Compliance in Road Transport Operations",
    venue: "IEOM Conference Proceedings",
    year: "2018",
    summary:
      "A conference paper focused on operational improvement and voluntary compliance in road transport operations, examining the measurable outcomes of structured compliance programmes.",
  },
];

export default function PublicationsPage() {
  return (
    <div
      style={{
        paddingTop: "5rem",
        background: "var(--color-slate-900)",
        minHeight: "100vh",
      }}
    >
      {/* Hero */}
      <section
        style={{
          padding: "5rem 0 4rem",
          background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="container-gfa">
          <h1 style={{ maxWidth: "600px", marginBottom: "1.25rem" }}>Publications</h1>
          <p style={{ maxWidth: "560px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Books, conference papers, and published articles by Abdool Kamdar \u2014 covering green freight
            transformation, road freight sustainability, electric truck transition, and professional driver
            development.
          </p>
        </div>
      </section>

      {/* Books */}
      <section style={{ padding: "5rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container-gfa">
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "3rem",
              color: "white",
            }}
          >
            Books
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "3.5rem",
            }}
          >
            {BOOKS.map(({ title, subtitle, author, description, image, year }) => (
              <div
                key={`${title}-${year}`}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "2.5rem",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                {/* Book cover */}
                <div
                  style={{
                    flexShrink: 0,
                    width: "10rem",
                  }}
                >
                  <div
                    style={{
                      borderRadius: "0.5rem",
                      overflow: "hidden",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <Image
                      src={image}
                      alt={title}
                      width={160}
                      height={226}
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  </div>
                </div>

                {/* Book details */}
                <div style={{ flex: 1, minWidth: "240px", paddingTop: "0.25rem" }}>
                  <div
                    style={{
                      display: "inline-block",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--color-teal-400)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {year}
                  </div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "white",
                      marginBottom: "0.25rem",
                      lineHeight: 1.3,
                    }}
                  >
                    {title}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--color-teal-400)",
                      marginBottom: "0.5rem",
                      fontStyle: "italic",
                    }}
                  >
                    {subtitle}
                  </p>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      marginBottom: "1rem",
                    }}
                  >
                    By {author}
                  </p>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.7,
                      maxWidth: "560px",
                    }}
                  >
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conference Papers */}
      <section style={{ padding: "5rem 0" }}>
        <div className="container-gfa">
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "3rem",
              color: "white",
            }}
          >
            Conference Papers and Articles
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            {PAPERS.map(({ title, venue, year, summary }) => (
              <div
                key={title}
                style={{
                  padding: "1.75rem 2rem",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "0.75rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    marginBottom: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--color-green-400)",
                      background: "rgba(34,197,94,0.08)",
                      border: "1px solid rgba(34,197,94,0.2)",
                      borderRadius: "9999px",
                      padding: "0.2rem 0.625rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {venue}
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      paddingTop: "0.2rem",
                    }}
                  >
                    {year}
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "white",
                    lineHeight: 1.45,
                    marginBottom: "0.75rem",
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.65,
                    maxWidth: "680px",
                  }}
                >
                  {summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
