"use client";

import { RotateCcw } from "lucide-react";
import { clearRateLimits } from "@/app/plataforma/actions";
import { Button } from "@/components/ui/button";
import { Flash, useRun } from "./shared";

export function ClearRateLimits() {
  const { flash, pending, run } = useRun();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button type="button" variant="secondary" loading={pending} icon={<RotateCcw className="size-4" aria-hidden />} onClick={() => run(clearRateLimits)}>
        Reiniciar límites
      </Button>
      <Flash result={flash} />
    </div>
  );
}
