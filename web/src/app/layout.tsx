import type { Metadata } from "next";
import { getCurrentOrg } from "@/lib/org";
import { themeCss } from "@/lib/theme";
import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/literata/wght.css";
import "@fontsource-variable/literata/wght-italic.css";
import "@fontsource-variable/dm-sans/wght.css";
import "@fontsource-variable/dm-sans/wght-italic.css";
import "@fontsource-variable/playfair-display/wght.css";
import "@fontsource-variable/playfair-display/wght-italic.css";
import "@fontsource-variable/source-serif-4/wght.css";
import "@fontsource-variable/source-serif-4/wght-italic.css";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/inter/wght-italic.css";
import "@fontsource-variable/merriweather/wght.css";
import "@fontsource-variable/merriweather/wght-italic.css";
import "@fontsource-variable/work-sans/wght.css";
import "@fontsource-variable/work-sans/wght-italic.css";
import "@fontsource-variable/space-grotesk/wght.css";
import "@fontsource/dm-serif-display/400.css";
import "@fontsource/dm-serif-display/400-italic.css";
import "./globals.css";

// Los cuatro juegos de tipografías que un medio puede elegir (lib/theme.ts).
// Están autoalojadas con @fontsource; los nombres de familia se asignan a las
// variables --f-* en globals.css.

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
    <html lang="es">
      <head>
        {/* colores, tipografías y esquinas del medio (valores validados en lib/theme.ts) */}
        <style id="tema-del-medio" dangerouslySetInnerHTML={{ __html: themeCss(org.theme) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
