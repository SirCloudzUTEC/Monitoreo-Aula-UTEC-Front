"use client";

import { Pause, Play, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSimulationControls, useSimulationStore } from "@/data/store/simulation-store";
import { cn } from "@/lib/utils";

const VELOCIDADES = [1, 3, 8];

export function SimulatorControls() {
  const controls = useSimulationControls();
  const { pause, resume, setSpeed } = useSimulationStore.getState();

  return (
    <div className="flex items-center gap-1 rounded-full border bg-muted/40 p-1">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-full"
              onClick={() => (controls.running ? pause() : resume())}
            >
              {controls.running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              <span className="sr-only">{controls.running ? "Pausar simulacion" : "Reanudar simulacion"}</span>
            </Button>
          }
        />
        <TooltipContent>{controls.running ? "Pausar datos simulados" : "Reanudar datos simulados"}</TooltipContent>
      </Tooltip>
      <div className="flex items-center gap-0.5 pr-1">
        <Zap className="ml-1 size-3.5 text-muted-foreground" />
        {VELOCIDADES.map((v) => (
          <Button
            key={v}
            variant={controls.speedMultiplier === v ? "secondary" : "ghost"}
            size="sm"
            className={cn("h-7 rounded-full px-2 text-xs", controls.speedMultiplier === v && "font-semibold")}
            onClick={() => setSpeed(v)}
          >
            {v}x
          </Button>
        ))}
      </div>
    </div>
  );
}
