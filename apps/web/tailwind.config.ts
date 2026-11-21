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
        obsidian: {
          950: "#07080A",
          900: "#0B0D10",
          850: "#0F1116",
          800: "#14171E",
          750: "#1A1E26",
          700: "#222732",
          600: "#323946",
          500: "#495262",
        },
        solar: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        lichen: {
          50: "#ECFDF5",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          900: "#064E3B",
          950: "#022C22",
        },
        frost: {
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
        },
        hazard: {
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          900: "#7F1D1D",
          950: "#450A0A",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
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
        tactile: "0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)",
        observatory: "0 4px 20px -2px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)",
        "solar-glow": "0 0 20px -3px rgba(245, 158, 11, 0.25)",
        "hazard-glow": "0 0 20px -3px rgba(239, 68, 68, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
