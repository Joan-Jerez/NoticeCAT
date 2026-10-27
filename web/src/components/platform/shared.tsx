"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import type { PlatformResult } from "@/app/plataforma/actions";
import { cx } from "@/lib/cx";

// Ejecuta una acción del panel y guarda su resultado para mostrarlo.
export function useRun() {
  const [flash, setFlash] = useState<PlatformResult | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<PlatformResult>) =>
    start(async () => {
      setFlash(await fn());
    });
  return { flash, pending, run };
}

export function Flash({ result, className }: { result: PlatformResult | null | undefined; className?: string }) {
  return (
    <p role="status" aria-live="polite" className={cx("min-h-6 text-ui-sm", className)}>
      {result && (
        <span key={result.ok ? result.message : result.error} className={cx("animate-fade-in inline-flex items-center gap-1.5", result.ok ? "text-success" : "text-danger")}>
          {result.ok ? <CheckCircle2 className="animate-pop size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />}
          {result.ok ? result.message : result.error}
        </span>
      )}
    </p>
  );
}

export function Panel({ title, description, children, tone = "default" }: { title: string; description?: string; children: React.ReactNode; tone?: "default" | "danger" }) {
  return (
    <section className={cx("rounded-lg bg-raised p-6 shadow-card", tone === "danger" && "border border-danger/30")}>
      <h2 className={cx("font-display text-title font-semibold", tone === "danger" && "text-danger")}>{title}</h2>
      {description && <p className="mt-1 text-ui-sm text-text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
