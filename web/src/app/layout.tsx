import type { Metadata } from "next";
import { DM_Sans, Fraunces, Literata } from "next/font/google";
import { getCurrentOrg } from "@/lib/org";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"], variable: "--font-nf-display" });
const serif = Literata({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--font-nf-serif" });
const sans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-nf-sans" });

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
