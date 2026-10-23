/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a verification build use its own folder so it never clobbers a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;
