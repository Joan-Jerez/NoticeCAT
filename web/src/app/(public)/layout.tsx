import { getCurrentOrg } from "@/lib/org";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { RevealObserver } from "@/components/motion/reveal-observer";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const org = await getCurrentOrg();
  return (
    <>
      {/* marca de agua: el logo, muy tenue, fijo en la esquina */}
      {org.logo && (
        <div
          aria-hidden
          className="pointer-events-none fixed bottom-6 right-6 -z-10 hidden h-40 w-96 bg-contain bg-right-bottom bg-no-repeat opacity-[0.06] md:block"
          style={{ backgroundImage: `url(${org.logo.src})` }}
        />
      )}
      <SiteHeader org={org} />
      <main id="contenido" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter org={org} />
      <RevealObserver />
    </>
  );
}
