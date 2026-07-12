import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portafolio Docente Digital",
    short_name: "Portafolio",
    description: "Gestión y supervisión del portafolio docente BTP.",
    start_url: "/portafolio",
    display: "standalone",
    background_color: "#f4f1e8",
    theme_color: "#123b35",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

