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
      colors: {
        canvas: {
          light: "#F8F9FA",
          DEFAULT: "#0E1117",
          dark: "#0E1117",
        },
        surface: {
          light: "#FFFFFF",
          DEFAULT: "#161B22",
          subtle: "#1F242C",
          elevated: "#232936",
        },
        border: {
          light: "#E5E7EB",
          DEFAULT: "#262C36",
          subtle: "#1E232B",
          highlight: "#3B4352",
        },
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
        },
        severity: {
          extreme: "#DC2626",
          severe: "#EA580C",
          moderate: "#D97706",
          minor: "#2563EB",
          unknown: "#6B7280",
        },
        agromet: {
          50: "#ECFDF5",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          surface: "#101815",
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
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)",
        elevated: "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)",
        dialog: "0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)",
      },
    },
  },
  plugins: [],
};
export default config;
