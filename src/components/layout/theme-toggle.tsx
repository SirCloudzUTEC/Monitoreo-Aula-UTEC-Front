"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    // Patron recomendado por next-themes: el tema resuelto solo se conoce
    // tras montar en el cliente, para evitar un mismatch de hidratacion.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontado(true);
  }, []);

  if (!montado) return <Button variant="ghost" size="icon" disabled className="opacity-0" />;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}
