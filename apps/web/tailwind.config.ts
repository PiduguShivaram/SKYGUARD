import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      borderRadius: {
        sg: "4px",
      },
      colors: {
        canvas: {
          light: "#F8F9FA",
          DEFAULT: "#0C0F14",
          dark: "#0C0F14",
        },
        surface: {
          light: "#FFFFFF",
          DEFAULT: "#131720",
          1: "#131720",
          2: "#1A1F2C",
          3: "#222838",
          subtle: "#1A1F2C",
          elevated: "#222838",
        },
        border: {
          light: "#E5E7EB",
          DEFAULT: "#2A3141",
          subtle: "#1E2432",
          highlight: "#38445A",
        },
        brand: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          text: "#60A5FA",
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
        },
        severity: {
          extreme: "#F87171",
          severe: "#FB923C",
          moderate: "#FCD34D",
          minor: "#60A5FA",
          clear: "#34D399",
          borderExtreme: "#DC2626",
          borderSevere: "#EA580C",
          borderModerate: "#D97706",
          borderMinor: "#2563EB",
          borderClear: "#059669",
          unknown: "#7C879B",
        },
        agromet: {
          50: "#ECFDF5",
          500: "#34D399",
          600: "#059669",
          700: "#047857",
          surface: "#0A1710",
          border: "#1C3326",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.4)",
        panel: "0 2px 6px rgba(0, 0, 0, 0.5)",
        dialog: "0 8px 24px rgba(0, 0, 0, 0.6)",
      },
    },
  },
  plugins: [],
};
export default config;
