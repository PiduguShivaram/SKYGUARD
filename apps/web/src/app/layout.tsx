import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkyGuard — Weather & Climate Intelligence",
  description:
    "Authoritative public weather forecasts, official IMD disaster warnings, and research-grounded climate risk indicators.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
