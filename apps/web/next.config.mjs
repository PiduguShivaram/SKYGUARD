/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Note: During local development, the browser will talk to the FastAPI backend at http://127.0.0.1:8000
  async rewrites() {
    const backendUrl = process.env.API_URL || process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
