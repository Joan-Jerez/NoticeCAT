"use client";

import { useEffect } from "react";

// Hace aparecer con suavidad los elementos con data-reveal cuando entran en
// pantalla. Lo que ya se ve al cargar se marca antes de activar la clase, así
// no parpadea; sin JS (o antes de hidratar) todo está visible.
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-shown", "");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    const watch = (el: Element) => {
      if (!el.hasAttribute("data-shown")) io.observe(el);
    };

    const inView = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    };
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      if (inView(el)) el.setAttribute("data-shown", "");
      else watch(el);
    });
    root.classList.add("reveal-on");

    // páginas nuevas al navegar y tarjetas de "Ver más notas"
    const mo = new MutationObserver((records) => {
      for (const r of records)
        r.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches("[data-reveal]")) watch(n);
          n.querySelectorAll("[data-reveal]").forEach(watch);
        });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove("reveal-on");
    };
  }, []);

  return null;
}
