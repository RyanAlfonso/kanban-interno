/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH
};

module.exports = nextConfig;
