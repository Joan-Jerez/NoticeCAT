"use client";

import { useState, useTransition } from "react";
import { vote } from "@/app/(public)/actions";
import type { Poll } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function PollBox({ poll, votedOptionId }: { poll: Poll; votedOptionId: string | null }) {
  const [choice, setChoice] = useState<string | null>(null);
  const [voted, setVoted] = useState(votedOptionId);
  const [options, setOptions] = useState(poll.options);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
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
    <section aria-labelledby="h-encuesta" className="self-start rounded-xs border border-border bg-raised p-5">
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
                    <span className={o.id === voted ? "font-semibold" : undefined}>
                      {o.label}
                      {o.id === voted && " · tu voto"}
                    </span>
                    <span>{pct} %</span>
                  </div>
                  <div className="mt-1 h-2 bg-surface" aria-hidden>
                    <div className="h-2 bg-accent" style={{ width: `${pct}%` }} />
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
                <label key={o.id} className="flex min-h-11 items-center gap-2 text-ui md:min-h-0">
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
