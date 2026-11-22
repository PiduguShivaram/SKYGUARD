import type { Metadata, Viewport } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL;

export const viewport: Viewport = {
  themeColor: "#0A1324",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  ...(appUrl ? { metadataBase: new URL(appUrl) } : {}),
  title: {
    default: "SkyGuard: Weather & Public Warnings",
    template: "%s | SkyGuard",
  },
  description:
    "Weather forecasts from Open-Meteo and global disaster bulletins from WMO and GDACS. Not an official warning service.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    siteName: "SkyGuard",
    title: "SkyGuard: Weather & Public Warnings",
    description:
      "Weather forecasts from Open-Meteo and global disaster bulletins from WMO and GDACS. Not an official warning service.",
  },
  twitter: {
    card: "summary",
    title: "SkyGuard: Weather & Public Warnings",
    description:
      "Weather forecasts from Open-Meteo and global disaster bulletins from WMO and GDACS. Not an official warning service.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0A1324] text-white antialiased selection:bg-[#2563EB] selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
