import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkyGuard — Weather & Climate Intelligence",
  description:
    "Authoritative public weather forecasts, official IMD & WMO disaster warnings, and research-grounded climate risk indicators.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0d10] text-zinc-100 antialiased selection:bg-amber-500 selection:text-black min-h-screen">
        {children}
      </body>
    </html>
  );
}
