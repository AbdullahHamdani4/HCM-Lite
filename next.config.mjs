/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["firebase-admin", "@react-pdf/renderer"],
};
export default nextConfig;
