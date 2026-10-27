"use client";

import { useEffect, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { vote } from "@/app/(public)/actions";
import type { Poll } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function PollBox({ poll, votedOptionId }: { poll: Poll; votedOptionId: string | null }) {
  const [choice, setChoice] = useState<string | null>(null);
  const [voted, setVoted] = useState(votedOptionId);
  const [options, setOptions] = useState(poll.options);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // las barras crecen desde cero al mostrarse los resultados
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (!voted) return;
    const t = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(t);
  }, [voted]);
  const closed = !!poll.endsAt && new Date(poll.endsAt) < new Date();
  const total = options.reduce((n, o) => n + o.votes, 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!choice) return setError("Elige una opción.");
    setError(null);
    start(async () => {
      const res = await vote(poll.id, choice);
      if (!res.ok) return setError(res.error);
      setOptions((opts) => opts.map((o) => (o.id === choice ? { ...o, votes: o.votes + 1 } : o)));
      setVoted(choice);
    });
  }

  return (
    <section aria-labelledby="h-encuesta" className="self-start rounded-lg bg-raised p-6 shadow-card">
      <p className="eyebrow text-accent">Encuesta</p>
      {voted || closed ? (
        <>
          <h2 id="h-encuesta" className="mt-1 font-display text-title-sm">{poll.question}</h2>
          <ul className="mt-4 space-y-3" aria-label="Resultados">
            {options.map((o) => {
              const pct = total ? Math.round((o.votes / total) * 100) : 0;
              return (
                <li key={o.id}>
                  <div className="flex justify-between text-ui-sm">
                    <span className={o.id === voted ? "inline-flex items-center gap-1.5 font-semibold" : undefined}>
                      {o.id === voted && <Check className="animate-pop size-3.5 text-accent" aria-hidden />}
                      {o.label}
                      {o.id === voted && " · tu voto"}
                    </span>
                    <span className="tabular-nums">{pct} %</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-surface" aria-hidden>
                    <div className="h-2 rounded-pill bg-accent transition-[width] duration-slow ease-soft" style={{ width: grown || closed ? `${pct}%` : "0%" }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-caption text-text-muted">{closed ? "Encuesta cerrada · " : ""}{total.toLocaleString("es-DO")} votos</p>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <fieldset>
            <legend id="h-encuesta" className="mt-1 font-display text-title-sm">{poll.question}</legend>
            <div className="mt-3 space-y-2">
              {options.map((o) => (
                <label key={o.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 text-ui transition-colors duration-fast hover:border-accent has-checked:border-accent has-checked:bg-surface-tint">
                  <input type="radio" name="opcion" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} className="size-4.5 accent-accent" />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p role="alert" className="mt-2 text-caption text-danger">{error}</p>}
          <Button type="submit" className="mt-4 w-full" loading={pending}>
            Votar
          </Button>
        </form>
      )}
    </section>
  );
}
