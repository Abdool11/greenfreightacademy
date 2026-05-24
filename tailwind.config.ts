import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ─── Design Tokens ───────────────────────────────────────────────
      // ZeroAfrica-aligned palette — deep navy/slate + green accent
      // Sister site aesthetic: clean, modern, institutional
      colors: {
        // Primary — deep navy (ZeroAfrica dark)
        navy: {
          950: "#0a0f1a",
          900: "#0d1526",
          800: "#111e35",
          700: "#162444",
          600: "#1c2d55",
          500: "#243669",
        },
        // Accent — green (ZeroAfrica signature)
        green: {
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        // Secondary accent — teal
        teal: {
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
        },
        // Neutral
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        // Semantic
        background: "#0d1526",
        foreground: "#f8fafc",
        card: "#111e35",
        border: "#1c2d55",
        muted: "#243669",
        "muted-foreground": "#94a3b8",
        primary: "#22c55e",
        "primary-foreground": "#0d1526",
        secondary: "#1c2d55",
        "secondary-foreground": "#f8fafc",
        accent: "#14b8a6",
        "accent-foreground": "#0d1526",
        destructive: "#ef4444",
        ring: "#22c55e",
      },
      // ─── Typography ───────────────────────────────────────────────────
      fontFamily: {
        display: ["DM Sans", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "display-2xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-xl": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["3rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "display-md": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-sm": ["1.875rem", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
      },
      // ─── Spacing ──────────────────────────────────────────────────────
      spacing: {
        "section": "6rem",
        "section-sm": "4rem",
      },
      // ─── Border radius ────────────────────────────────────────────────
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      // ─── Shadows ──────────────────────────────────────────────────────
      boxShadow: {
        "card": "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
        "card-hover": "0 10px 40px rgba(0,0,0,0.4), 0 4px 16px rgba(34,197,94,0.1)",
        "glow-green": "0 0 40px rgba(34,197,94,0.15)",
        "glow-teal": "0 0 40px rgba(20,184,166,0.15)",
      },
      // ─── Background gradients ─────────────────────────────────────────
      backgroundImage: {
        "hero-gradient": "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(34,197,94,0.12) 0%, transparent 70%), linear-gradient(180deg, #0d1526 0%, #0a0f1a 100%)",
        "section-gradient": "linear-gradient(180deg, #0d1526 0%, #111e35 100%)",
        "card-gradient": "linear-gradient(135deg, #111e35 0%, #162444 100%)",
        "green-gradient": "linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)",
      },
      // ─── Animation ────────────────────────────────────────────────────
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
