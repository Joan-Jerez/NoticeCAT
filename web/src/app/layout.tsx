import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display, Fraunces, Inter, Literata, Merriweather, Playfair_Display, Source_Serif_4, Space_Grotesk, Work_Sans } from "next/font/google";
import { getCurrentOrg } from "@/lib/org";
import { themeCss } from "@/lib/theme";
import "./globals.css";

// Los cuatro juegos de tipografías que un medio puede elegir (lib/theme.ts).
// Solo se descargan las que la página usa; se precargan las del juego por defecto.
const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"], variable: "--f-fraunces" });
const literata = Literata({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--f-literata" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--f-dmsans" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], style: ["normal", "italic"], variable: "--f-playfair", preload: false });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--f-sourceserif", preload: false });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--f-inter", preload: false });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--f-grotesk", preload: false });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: ["400"], style: ["normal", "italic"], variable: "--f-dmserif", preload: false });
const merriweather = Merriweather({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--f-merriweather", preload: false });
const workSans = Work_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--f-worksans", preload: false });
const fonts = [fraunces, literata, dmSans, playfair, sourceSerif, inter, grotesk, dmSerif, merriweather, workSans].map((f) => f.variable).join(" ");

export async function generateMetadata(): Promise<Metadata> {
  const org = await getCurrentOrg();
  return {
    title: { default: org.name, template: `%s · ${org.name}` },
    description: org.tagline,
    openGraph: { siteName: org.name, locale: org.locale.replace("-", "_"), type: "website" },
    ...(org.logo && { icons: { icon: org.logo.src } }),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const org = await getCurrentOrg();
  return (
    <html lang="es" className={fonts}>
      <head>
        {/* colores, tipografías y esquinas del medio (valores validados en lib/theme.ts) */}
        <style id="tema-del-medio" dangerouslySetInnerHTML={{ __html: themeCss(org.theme) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
