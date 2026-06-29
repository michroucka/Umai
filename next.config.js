/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    serverActions: {
        bodySizeLimit: '10mb',
    },
};

module.exports = nextConfig;
