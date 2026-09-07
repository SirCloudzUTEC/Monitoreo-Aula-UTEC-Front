import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
