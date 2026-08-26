import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Vercel's Root Directory is apps/web, so Next traces from there by default
  // and silently drops everything above it -- including the Prisma query
  // engine at packages/db/src/generated/client. The function then boots and
  // throws PrismaClientInitializationError: engine binary not found.
  outputFileTracingRoot: repoRoot,
  outputFileTracingIncludes: {
    // scripts/copy-prisma-engine.mjs puts the engine here, because this is the
    // first path Prisma searches at runtime. Tracing it from packages/db is not
    // enough -- the file ships, but lands somewhere Prisma never looks.
    '/api/**/*': ['./src/generated/client/**/*'],
  },
  // Workspace packages ship as TypeScript source, so Next compiles them itself.
  transpilePackages: ['@mizan/domain', '@mizan/contracts', '@mizan/db'],
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
