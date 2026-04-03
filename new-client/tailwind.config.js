/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Accent — driven entirely by CSS vars set in ThemeContext ──────────
        accent: {
          DEFAULT: "var(--accent)", // bg-accent / text-accent / border-accent
          dim: "rgba(var(--accent-rgb), 0.09)", // bg-accent-dim
          muted: "rgba(var(--accent-rgb), 0.16)", // bg-accent-muted
          glow: "rgba(var(--accent-rgb), 0.38)", // shadow-accent-glow  (use in boxShadow key if needed)
        },

        // ── Surface tokens — light values here, dark overrides via Tailwind dark: ──
        nav: {
          bg: "var(--nav-bg)",
        },
        surface: {
          DEFAULT: "var(--surface)",
        },
        page: {
          bg: "var(--page-bg)",
        },
        input: {
          bg: "var(--input-bg)",
        },
        border: {
          theme: "var(--border)",
        },
        text: {
          primary: "var(--text-primary)",
          sub: "var(--text-sub)",
          faint: "var(--text-faint)",
        },
      },
      boxShadow: {
        theme: "var(--shadow)",
        accent: "0 3px 10px rgba(var(--accent-rgb), 0.38)",
      },
      fontFamily: {
        "plus-jakarta": ["Plus Jakarta Sans", "sans-serif"],
      },
      zIndex: {
        9999: "9999",
      },
      keyframes: {
        slideIn: {
          from: { opacity: "0", transform: "translateY(-6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        slideIn: "slideIn 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};
