/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Note: During local development, the browser will talk to the FastAPI backend at http://127.0.0.1:8000
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
