"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { horaLarga } from "@/lib/format";

/**
 * Wall clock in Lima time, ticking locally every second. It lives in its own component so the
 * per-second re-render stays here instead of re-rendering the whole app shell.
 */
export function RelojLima() {
  const [ahoraMs, setAhoraMs] = useState(0);
  useEffect(() => {
    const tick = () => setAhoraMs(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <Badge variant="outline" className="font-mono tabular-nums" title="Hora de Lima">
      {ahoraMs ? horaLarga(ahoraMs) : "--:--:--"}
    </Badge>
  );
}
