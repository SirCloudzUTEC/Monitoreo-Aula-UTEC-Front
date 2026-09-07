"use client";

// Particle orb inspired by the user's visual references: a volumetric cloud
// of fine particles (white + UTEC cyan) instead of a smooth gradient sphere.
// States map to REAL assistant activity only; no fake listening animation.
// Honors prefers-reduced-motion and pauses when the tab is hidden.

import { useEffect, useRef } from "react";

export type OrbState = "listo" | "escuchando" | "procesando" | "hablando" | "error";

interface Particle {
  /** spherical coords over the unit sphere */
  theta: number;
  phi: number;
  /** radius jitter to keep the silhouette organic */
  radius: number;
  /** per-particle animation offset */
  seed: number;
  /** 0 = white, 1 = cyan */
  tint: number;
}

const PARTICLE_COUNT = 900;
const STATE_SPEED: Record<OrbState, number> = {
  listo: 0.12,
  escuchando: 0.35,
  procesando: 0.75,
  hablando: 0.45,
  error: 0.05,
};

function createParticles(): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Fibonacci sphere for an even, organic distribution.
    const t = i / PARTICLE_COUNT;
    particles.push({
      theta: Math.acos(1 - 2 * t),
      phi: Math.PI * (1 + Math.sqrt(5)) * i,
      radius: 0.75 + Math.random() * 0.3,
      seed: Math.random() * Math.PI * 2,
      tint: Math.random() < 0.38 ? 1 : 0,
    });
  }
  return particles;
}

export function ParticleOrb({
  state = "listo",
  className,
  size = 320,
}: {
  state?: OrbState;
  className?: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<OrbState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const particles = createParticles();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    let last = performance.now();
    let rotation = 0;

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const currentState = stateRef.current;
      if (!reducedMotion) rotation += dt * STATE_SPEED[currentState];

      const half = size / 2;
      const orbRadius = half * 0.72;
      ctx.clearRect(0, 0, size, size);

      for (const p of particles) {
        const wobble = reducedMotion
          ? 0
          : Math.sin(now / 900 + p.seed) * 0.05;
        const r = (p.radius + wobble) * orbRadius;
        const sinT = Math.sin(p.theta);
        const x3 = sinT * Math.cos(p.phi + rotation);
        const y3 = Math.cos(p.theta);
        const z3 = sinT * Math.sin(p.phi + rotation);

        const depth = (z3 + 1) / 2; // 0 back, 1 front
        const x = half + x3 * r;
        const y = half + y3 * r * 0.96;

        const alpha = 0.15 + depth * 0.65;
        const dotSize = 0.5 + depth * 1.3;
        ctx.fillStyle =
          currentState === "error"
            ? `rgba(220, 120, 120, ${alpha})`
            : p.tint === 1
              ? `rgba(55, 187, 236, ${alpha})`
              : `rgba(235, 244, 250, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reducedMotion && !document.hidden) {
        raf = requestAnimationFrame(draw);
      }
    };

    raf = requestAnimationFrame(draw);
    const onVisibility = () => {
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Orbe del asistente, estado: ${state}`}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
