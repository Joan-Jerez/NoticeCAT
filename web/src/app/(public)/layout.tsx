import { getCurrentOrg } from "@/lib/org";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { RevealObserver } from "@/components/motion/reveal-observer";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const org = await getCurrentOrg();
  return (
    <>
      <SiteHeader org={org} />
      <main id="contenido" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter org={org} />
      <RevealObserver />
    </>
  );
}
