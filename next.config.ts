import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The prompt SKILLs are read from disk at request time (src/lib/prompts/*.md).
  // Next.js' output file tracing can't see those fs.readFileSync paths, so they
  // must be included explicitly or the API routes 500 in production (Vercel).
  // Keys are route globs; values are project-root-relative file globs.
  outputFileTracingIncludes: {
    "/api/**": ["./src/lib/prompts/**/*.md"],
  },
};

export default nextConfig;
