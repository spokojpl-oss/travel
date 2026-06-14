import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Travel.app – Planuj wakacje dla rodziny",
    short_name: "Travel.app",
    description:
      "Travel planner dla rodzin — aktywności, hotele, loty i folder wyjazdu",
    start_url: "/app",
    scope: "/",
    id: "/",
    display: "standalone",
    background_color: "#001b4a",
    theme_color: "#003faa",
    orientation: "portrait-primary",
    lang: "pl",
    categories: ["travel", "lifestyle", "utilities"],
    icons: [
      {
        src: "/icons/72",
        sizes: "72x72",
        type: "image/png",
      },
      {
        src: "/icons/96",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/icons/128",
        sizes: "128x128",
        type: "image/png",
      },
      {
        src: "/icons/144",
        sizes: "144x144",
        type: "image/png",
      },
      {
        src: "/icons/152",
        sizes: "152x152",
        type: "image/png",
      },
      {
        src: "/icons/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/384",
        sizes: "384x384",
        type: "image/png",
      },
      {
        src: "/icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
