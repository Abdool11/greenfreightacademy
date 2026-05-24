import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-slate-900)",
        padding: "2rem",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "5rem",
            color: "var(--color-green-400)",
            lineHeight: 1,
            marginBottom: "1rem",
          }}
        >
          404
        </div>
        <h2 style={{ marginBottom: "0.75rem" }}>Page not found</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/" className="btn-primary">
          Return to GreenFreightAcademy
        </Link>
      </div>
    </div>
  );
}
