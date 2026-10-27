"use client";

import { useEffect, useState } from "react";
import { Check, Facebook, Link as LinkIcon, Mail, MessageCircle, Send, Share2, Twitter } from "lucide-react";
import { iconButtonClass } from "@/components/ui/button";
import { cx } from "@/lib/cx";

export function ShareBar({ url, title, vertical = false }: { url: string; title: string; vertical?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare("share" in navigator), []);

  // la URL absoluta se arma en el navegador para no depender del dominio del servidor
  const abs = () => new URL(url, window.location.origin).toString();
  const open = (target: (u: string, t: string) => string) => () => window.open(target(encodeURIComponent(abs()), encodeURIComponent(title)), "_blank", "noopener,noreferrer");

  const networks = [
    { label: "Compartir en WhatsApp", icon: MessageCircle, href: (u: string, t: string) => `https://wa.me/?text=${t}%20${u}` },
    { label: "Compartir en Facebook", icon: Facebook, href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: "Compartir en X", icon: Twitter, href: (u: string, t: string) => `https://x.com/intent/post?url=${u}&text=${t}` },
    { label: "Compartir en Telegram", icon: Send, href: (u: string, t: string) => `https://t.me/share/url?url=${u}&text=${t}` },
    { label: "Enviar por correo", icon: Mail, href: (u: string, t: string) => `mailto:?subject=${t}&body=${u}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(abs());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // portapapeles bloqueado: no hay nada útil que hacer
    }
  }

  return (
    <div className={cx("flex items-center gap-0.5", vertical ? "flex-col border-y border-border py-2" : "rounded-pill border border-border bg-raised p-1")}>
      {vertical && <span className="eyebrow pb-1 text-text-muted">Compartir</span>}
      {canShare && !vertical && (
        <button type="button" aria-label="Compartir" title="Compartir" className={iconButtonClass("md:hidden")} onClick={() => navigator.share({ title, url: abs() }).catch(() => {})}>
          <Share2 className="size-4" aria-hidden />
        </button>
      )}
      {networks.map(({ label, icon: Icon, href }) => (
        <button key={label} type="button" aria-label={label} title={label} onClick={open(href)} className={iconButtonClass(cx(canShare && !vertical && "hidden md:grid", "hover:text-accent"))}>
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
      <button type="button" aria-label="Copiar enlace" title="Copiar enlace" onClick={copy} className={iconButtonClass()}>
        {copied ? <Check className="animate-pop size-4 text-success" aria-hidden /> : <LinkIcon className="size-4" aria-hidden />}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Enlace copiado" : ""}
      </span>
    </div>
  );
}
