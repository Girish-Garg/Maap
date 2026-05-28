import type { MetadataRoute } from "next";

/** Web app manifest (architecture §PWA). Makes Maap installable to the home
 *  screen on Android and iOS, launching standalone at the project list. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Maap",
    short_name: "Maap",
    description: "Precise wood measurement.",
    start_url: "/projects",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAFAF9",
    theme_color: "#FAFAF9",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
