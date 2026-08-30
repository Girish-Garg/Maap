/** @type {import('next').NextConfig} */
const nextConfig = {
  // No remote image hosts: the business logo is served from this origin by
  // /api/logo, because the object storage bucket is private.
};

export default nextConfig;
