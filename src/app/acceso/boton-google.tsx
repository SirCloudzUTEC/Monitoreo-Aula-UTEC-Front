"use client";

import { signIn } from "next-auth/react";

export function BotonGoogle() {
  return (
    <button
      type="button"
      onClick={() => void signIn("google", { callbackUrl: "/" })}
      className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
    >
      Continuar con cuenta UTEC
    </button>
  );
}
