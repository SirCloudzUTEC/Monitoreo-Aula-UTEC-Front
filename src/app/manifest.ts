import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aula Digital UTEC",
    short_name: "Aula Digital",
    description:
      "Gemelo digital de las aulas instrumentadas L-419 y A-1001: confort, calidad de aire, aforo, accesos y seguridad en tiempo real.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
