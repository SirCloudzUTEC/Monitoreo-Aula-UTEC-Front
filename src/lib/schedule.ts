import type { AulaCodigo, BloqueHorario, Horario } from "@/lib/types";

/**
 * The campus lives in America/Lima (UTC-5, no DST). All schedule math is done
 * in Lima wall time regardless of where the code runs (Vercel is UTC), by
 * shifting the instant and reading UTC fields.
 */
export const LIMA_OFFSET_MS = 5 * 3600_000;

function limaView(d: Date): Date {
  return new Date(d.getTime() - LIMA_OFFSET_MS);
}

/** Day of week (0=Sunday) in Lima wall time. */
export function diaLima(d: Date): number {
  return limaView(d).getUTCDay();
}

function minutesOfDay(d: Date): number {
  const v = limaView(d);
  return v.getUTCHours() * 60 + v.getUTCMinutes();
}

function parseHM(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

export function bloqueEnCurso(
  horario: Horario,
  aula: AulaCodigo,
  fecha: Date,
): BloqueHorario | null {
  const mins = minutesOfDay(fecha);
  const dia = diaLima(fecha);
  for (const b of horario[aula] ?? []) {
    if (b.dia === dia && mins >= parseHM(b.inicio) && mins < parseHM(b.fin)) return b;
  }
  return null;
}

export function claseEnCurso(horario: Horario, aula: AulaCodigo, fecha: Date): boolean {
  return bloqueEnCurso(horario, aula, fecha) !== null;
}

/** Next scheduled block from `fecha`, looking up to 7 days ahead. */
export function proximoBloque(
  horario: Horario,
  aula: AulaCodigo,
  fecha: Date,
): { bloque: BloqueHorario; inicia: Date } | null {
  const bloques = horario[aula] ?? [];
  if (bloques.length === 0) return null;
  for (let d = 0; d < 8; d++) {
    const dia = (diaLima(fecha) + d) % 7;
    const candidatos = bloques
      .filter((b) => b.dia === dia)
      .sort((a, b) => parseHM(a.inicio) - parseHM(b.inicio));
    for (const b of candidatos) {
      // build the instant: midnight Lima of that day + block start
      const baseLima = new Date(fecha.getTime() - LIMA_OFFSET_MS);
      baseLima.setUTCDate(baseLima.getUTCDate() + d);
      baseLima.setUTCHours(0, 0, 0, 0);
      const inicia = new Date(baseLima.getTime() + LIMA_OFFSET_MS + parseHM(b.inicio) * 60_000);
      if (inicia.getTime() > fecha.getTime()) return { bloque: b, inicia };
    }
  }
  return null;
}

/** Minutes remaining of a block in course at `fecha`. */
export function minutosRestantes(bloque: BloqueHorario, fecha: Date): number {
  return parseHM(bloque.fin) - minutesOfDay(fecha);
}

export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
