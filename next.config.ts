import type { NextConfig } from "next";

/**
 * The access token lives in JS memory, so an injected script could use it while the tab is open.
 * The CSP narrows where scripts may come from and, above all, where the page may send data:
 * `connect-src` only allows this origin and the backend API. Next.js needs inline scripts for
 * hydration, hence 'unsafe-inline' (a nonce-based policy would require a dynamic middleware);
 * 'unsafe-eval' and websockets are only added in development (HMR).
 */
function origenApi(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").origin;
  } catch {
    return "";
  }
}

function politicaCsp(): string {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${origenApi()}${dev ? " ws: wss:" : ""}`.trim(),
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const nextConfig: NextConfig = {
  experimental: {
    // barrel packages: keep only the imported members in the client bundles
    optimizePackageImports: ["recharts", "radix-ui", "lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: politicaCsp() },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/", permanent: false },
      { source: "/configuracion", destination: "/ajustes", permanent: false },
      { source: "/footprint", destination: "/log", permanent: false },
      { source: "/aulas/:aulaId", destination: "/aula/:aulaId", permanent: false },
      { source: "/login", destination: "/ajustes", permanent: false },
    ];
  },
};

export default nextConfig;
