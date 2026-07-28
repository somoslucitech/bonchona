import type { Metadata } from "next";
import NosotrosClient from "@/components/NosotrosClient";

const TITLE = "Nuestra Historia";
const DESCRIPTION =
  "Desde 1997 en el 107.1 del dial. La historia de Radio Bonchona, el legado de Carlos Briceño y la segunda generación de la Sintonía Total en Valencia, Carabobo.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/nosotros" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/nosotros",
  },
};

export default function NosotrosPage() {
  return <NosotrosClient />;
}
