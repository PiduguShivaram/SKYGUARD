import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkyGuard — Weather & Public Warnings",
  description:
    "Authoritative public weather forecasts from Open-Meteo, official emergency warnings from WMO & NDMA, and research-grounded climate risk indicators.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0e1117] text-zinc-100 antialiased selection:bg-blue-600 selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
