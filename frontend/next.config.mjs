/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SIGNAL_HOST: "ws://localhost:3050",
    NEXT_PUBLIC_CLIENT_HOST: "http://localhost:3000",
  },
};

export default nextConfig;
