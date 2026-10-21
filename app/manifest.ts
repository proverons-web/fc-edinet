import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FC Edineț",
    short_name: "FC Edineț",
    description: "Site-ul oficial al clubului de fotbal FC Edineț.",
    start_url: "/",
    display: "standalone",
    background_color: "#020E21",
    theme_color: "#031A38",
    icons: [
      {
        src: "/brand/fc-edinet-crest.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
