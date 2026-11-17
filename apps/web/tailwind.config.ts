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
        skyguard: {
          bg: "#0B132B",
          surface: "#1C2541",
          card: "#162038",
          border: "#2A3859",
          accent: "#3A86FF",
          accentHover: "#2563EB",
          text: "#F8FAFC",
          muted: "#94A3B8",
          warning: "#EAB308",
          danger: "#EF4444",
          success: "#10B981"
        }
      }
    },
  },
  plugins: [],
};
export default config;
