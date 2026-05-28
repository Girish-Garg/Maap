import type { Config } from "tailwindcss";

/**
 * Design tokens transcribed from design.md (sections 3, 4, 5, 6.5).
 * Light mode is the primary surface; dark mode (Phase 3) lives behind the
 * `dark:` variant using the same token names mapped to the §3.2 palette.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm neutral foundation + a single amber accent (§3.1).
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        text: "var(--text)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-soft": "var(--accent-soft)",
        "accent-text": "var(--accent-text)",
        success: "var(--success)",
        error: "var(--error)",
        warning: "var(--warning)",
      },
      fontFamily: {
        // §4.1 - Satoshi for UI, JetBrains Mono for numerics.
        sans: ["var(--font-satoshi)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // §4.2 - 1.25 minor-third scale rooted at 16px.
        xs: ["12px", "16px"],
        sm: ["14px", "20px"],
        base: ["16px", "24px"],
        md: ["18px", "26px"],
        lg: ["20px", "28px"],
        xl: ["24px", "32px"],
        "2xl": ["30px", "36px"],
        "3xl": ["40px", "44px"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
      },
      transitionTimingFunction: {
        // §8.1 - ease-out-quart for entrances, ease-in for exits.
        entrance: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
