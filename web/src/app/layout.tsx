import type { Metadata } from "next";
import { Inter, Playfair_Display, Source_Serif_4 } from "next/font/google";
import { getCurrentOrg } from "@/lib/org";
import "./globals.css";

const display = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], style: ["normal", "italic"], variable: "--font-nf-display" });
const serif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-nf-serif" });
const sans = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-nf-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const org = await getCurrentOrg();
  return {
    title: { default: org.name, template: `%s · ${org.name}` },
    description: org.tagline,
    openGraph: { siteName: org.name, locale: org.locale.replace("-", "_"), type: "website" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${display.variable} ${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
