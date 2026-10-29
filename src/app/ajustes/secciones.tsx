"use client";

// The sections of /ajustes. Each one owns its own draft state, so typing in
// one section never re-renders the others.

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BellIcon, ClockIcon, LayoutDashboardIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Nota, SectionCard } from "@/components/common/layout";
import { Campo, SelectSimple } from "@/components/common/form";
import { useApp, type PrefsAulas } from "@/lib/store";
import { CODIGOS_AULA } from "@/lib/aulas";
import { useCerrarSesion, useGuardarHorario, useGuardarUmbrales, useHabilitado, useHorario, useUmbrales } from "@/lib/api/hooks";
import { mensajeDeError } from "@/lib/api/client";
import { ETIQUETA_ROL } from "@/lib/auth/identity";
import { saveLocal } from "@/lib/data/storage";
import { DIAS_SEMANA } from "@/lib/schedule";
import { desuscribirPush, probarPush, pushSoportado, suscribirPush, suscripcionActual } from "@/lib/notify/push-client";
import type { AulaCodigo, BloqueHorario, Horario, Umbrales } from "@/lib/types";
import { useLocal } from "@/lib/use-local";
import { useOnline } from "@/lib/use-online";

/** Thresholds and schedule are editable by an online admin account. */
function useEsAdmin() {
  const online = useOnline();
  return useHabilitado("gestionar_dispositivos") && online;
}

// ---------------------------------------------------------------------------

export function SeccionCuenta() {
  const cuenta = useApp((s) => s.cuenta);
  const cerrarSesion = useCerrarSesion();
  const gestionaUsuarios = useHabilitado("gestionar_usuarios");
  return (
    <SectionCard icon={ShieldCheckIcon} title="Cuenta" contentClassName="flex flex-wrap items-center gap-3">
      {cuenta ? (
        <>
          <p className="text-sm">
            {cuenta.nombre || cuenta.email} ({cuenta.email}) · rol <strong>{ETIQUETA_ROL[cuenta.rol]}</strong> ·
            estado <strong className="capitalize">{cuenta.estado}</strong>
          </p>
          <Button variant="outline" size="sm" onClick={() => void cerrarSesion()}>
            Cerrar sesión
          </Button>
          {gestionaUsuarios && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/usuarios">Gestionar usuarios</Link>
            </Button>
          )}
          {cuenta.estado !== "aprobada" && (
            <p className="w-full text-xs text-muted-foreground">
              Tu cuenta está {cuenta.estado}: la administración debe aprobarla antes de que puedas editar datos.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay una sesión activa.{" "}
          <Link href="/acceso" className="underline">
            Inicia sesión con tu cuenta UTEC
          </Link>
          .
        </p>
      )}
      <p className="w-full text-xs text-muted-foreground">
        Solo una cuenta administradora o superusuaria puede editar umbrales y horario. La app no captura imágenes ni
        audio.
      </p>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------

const sinSuscripcion = () => () => {};
const sinPushEnServidor = () => false;

export function SeccionNotificaciones() {
  const supportsPush = useSyncExternalStore(sinSuscripcion, pushSoportado, sinPushEnServidor);
  const cuenta = useApp((s) => s.cuenta);
  const sonido = useApp((s) => s.sonido);
  const setSonido = useApp((s) => s.setSonido);
  const esAdmin = useEsAdmin();
  const online = useOnline();
  const puedeRecibirAlertas = useHabilitado("recibir_alertas") && online;
  const [pushActivo, setPushActivo] = useState(false);
  useEffect(() => {
    // the browser's push subscription is client-only state
    void suscripcionActual().then((s) => setPushActivo(Boolean(s)));
  }, []);

  const activarPush = async () => {
    try {
      await suscribirPush();
      setPushActivo(true);
      toast.success("Notificaciones push activadas en este navegador.");
    } catch (e) {
      toast.error(mensajeDeError(e, "No se pudo activar el push."));
    }
  };

  return (
    <SectionCard icon={BellIcon} title="Notificaciones" contentClassName="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Switch id="sonido" checked={sonido} onCheckedChange={setSonido} />
        <Label htmlFor="sonido">Sonido en alertas críticas</Label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {pushActivo ? (
          <>
            <span className="text-sm text-emerald-700 dark:text-emerald-400">✓ Push activo en este navegador</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!esAdmin}
              onClick={async () => {
                const err = await probarPush(cuenta?.email ?? "");
                if (err) toast.error(err);
                else toast.success("Notificación de prueba enviada.");
              }}
            >
              Enviar prueba
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await desuscribirPush();
                setPushActivo(false);
                toast.info("Suscripción push eliminada.");
              }}
            >
              Desactivar
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={activarPush} disabled={!supportsPush || !puedeRecibirAlertas}>
            Activar notificaciones push
          </Button>
        )}
        {!supportsPush && <span className="text-xs text-muted-foreground">Este navegador no soporta Web Push.</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        Canales adicionales (correo, Telegram) quedan listos como adaptadores para la fase 2.
      </p>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------

const MAX_AULAS_PANEL = 4;
const MODOS_PANEL: Record<PrefsAulas["modo"], string> = {
  representativas: "Más representativas (por defecto)",
  manual: "Seleccionar aulas",
};

export function SeccionPanel() {
  const prefs = useApp((s) => s.prefsAulas);
  const setPrefs = useApp((s) => s.setPrefsAulas);

  const alternar = (a: AulaCodigo, elegida: boolean) => {
    if (elegida && prefs.seleccion.length >= MAX_AULAS_PANEL) {
      toast.error(`Como máximo puedes elegir ${MAX_AULAS_PANEL} aulas para el panel general.`);
      return;
    }
    setPrefs({
      ...prefs,
      seleccion: elegida ? [...prefs.seleccion, a] : prefs.seleccion.filter((x) => x !== a),
    });
  };

  return (
    <SectionCard icon={LayoutDashboardIcon} title="Panel general">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="modo-aulas">Visualización de aulas</Label>
        <SelectSimple
          id="modo-aulas"
          value={prefs.modo}
          onChange={(modo) => setPrefs({ ...prefs, modo })}
          opciones={MODOS_PANEL}
          className="w-64"
        />
        <p className="text-xs text-muted-foreground">
          Elige qué aulas se destacan primero en el panel general (máximo {MAX_AULAS_PANEL}). Con &ldquo;Seleccionar
          aulas&rdquo;, solo esas aparecerán ahí; el resto queda a un clic en &ldquo;Ver más aulas&rdquo;.
        </p>
      </div>
      {prefs.modo === "manual" && (
        <div className="flex flex-col gap-2">
          {CODIGOS_AULA.map((a) => (
            <div key={a} className="flex items-center gap-3">
              <Switch
                id={`aula-pref-${a}`}
                checked={prefs.seleccion.includes(a)}
                onCheckedChange={(v) => alternar(a, v)}
              />
              <Label htmlFor={`aula-pref-${a}`}>{a}</Label>
            </div>
          ))}
          {prefs.seleccion.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Sin aulas seleccionadas: se usará el orden por defecto mientras tanto.
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------

/** [threshold key, label] grouped by topic. */
const GRUPOS_UMBRALES: { titulo: string; campos: [keyof Umbrales, string][] }[] = [
  {
    titulo: "Confort térmico",
    campos: [
      ["umbralTemp", "Temperatura máx (°C)"],
      ["umbralTempHisteresis", "Histéresis temperatura (°C)"],
      ["umbralTempPersistenciaMin", "Persistencia temperatura (min)"],
      ["hrMin", "Humedad mín (%)"],
      ["hrMax", "Humedad máx (%)"],
      ["hrPersistenciaMin", "Persistencia humedad (min)"],
    ],
  },
  {
    titulo: "Iluminación",
    campos: [
      ["umbralLux", "Lux mín en clase (lx)"],
      ["luxObjetivo", "Lux objetivo (lx)"],
      ["luxPersistenciaMin", "Persistencia iluminación (min)"],
    ],
  },
  {
    titulo: "Calidad de aire",
    campos: [
      ["co2Aviso", "CO₂ aviso (ppm)"],
      ["co2Alerta", "CO₂ alerta (ppm)"],
      ["co2PersistenciaMin", "Persistencia CO₂ (min)"],
      ["pm25Max", "PM2.5 máx (µg/m³)"],
      ["pm25PersistenciaMin", "Persistencia PM2.5 (min)"],
    ],
  },
  { titulo: "Ruido", campos: [["umbralRuido", "Ruido máx (dBA, LAeq 1 min)"]] },
  {
    titulo: "Aforo y accesos",
    campos: [
      ["aforoMaximo", "Aforo máximo (personas)"],
      ["puertaAbiertaMaxEnClaseMin", "Puerta abierta máx en clase (min)"],
      ["puertaAbiertaMaxFueraHorarioMin", "Puerta abierta máx fuera de horario (min)"],
    ],
  },
  {
    titulo: "Perímetro de ventanas",
    campos: [
      ["distVentana", "Distancia mínima (m)"],
      ["distVentanaHisteresis", "Histéresis distancia (m)"],
      ["distVentanaPersistenciaSeg", "Persistencia (s)"],
    ],
  },
  {
    titulo: "Salud de nodos",
    campos: [
      ["bateriaBaja", "Batería baja (%)"],
      ["latidoMin", "Periodo de latido (min)"],
      ["nodoSinDatosMin", "Nodo sin datos tras (min)"],
      ["procesadorOfflineSeg", "Procesador offline tras (s)"],
    ],
  },
];

export function SeccionUmbrales() {
  const esAdmin = useEsAdmin();
  const { umbrales, listo } = useUmbrales();
  const guardar = useGuardarUmbrales();
  const [borrador, setBorrador] = useState<Partial<Record<keyof Umbrales, string>>>({});
  // Until the live values arrive the form shows placeholders; saving those would
  // overwrite the real thresholds with defaults.
  const editable = esAdmin && listo;
  const valorCampo = (k: keyof Umbrales) => borrador[k] ?? String(umbrales[k]);

  const enviar = async () => {
    const nuevos = { ...umbrales };
    for (const [clave, etiqueta] of GRUPOS_UMBRALES.flatMap((g) => g.campos)) {
      const v = Number(valorCampo(clave));
      if (!Number.isFinite(v) || v < 0) {
        toast.error(`Valor inválido en "${etiqueta}".`);
        return;
      }
      nuevos[clave] = v;
    }
    try {
      await guardar.mutateAsync(nuevos);
    } catch (e) {
      toast.error(mensajeDeError(e, "No se pudieron guardar los umbrales."));
      return;
    }
    setBorrador({});
    toast.success("Umbrales guardados; el cambio queda auditado en el servidor.");
  };

  return (
    <SectionCard title="Umbrales de confort y seguridad">
      {esAdmin && !listo && <Nota>Cargando los umbrales vigentes del servidor…</Nota>}
      {!esAdmin && <Nota>Solo lectura: necesitas una cuenta administradora o superusuaria para editar.</Nota>}
      {GRUPOS_UMBRALES.map((g) => (
        <fieldset key={g.titulo} className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-medium">{g.titulo}</legend>
          {g.campos.map(([clave, etiqueta]) => (
            <Campo key={clave} id={clave} label={etiqueta}>
              <Input
                id={clave}
                type="number"
                step="any"
                min={0}
                disabled={!editable}
                value={valorCampo(clave)}
                onChange={(e) => setBorrador((b) => ({ ...b, [clave]: e.target.value }))}
              />
            </Campo>
          ))}
        </fieldset>
      ))}
      <div>
        <Button onClick={enviar} disabled={!editable}>
          Guardar umbrales
        </Button>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------

const BLOQUE_NUEVO: BloqueHorario = { dia: 1, inicio: "08:00", fin: "10:00", curso: "Nuevo curso" };
const OPCIONES_DIA = Object.fromEntries(DIAS_SEMANA.map((d, i) => [String(i), d]));

export function SeccionHorario() {
  const esAdmin = useEsAdmin();
  const { horario, listo } = useHorario();
  const guardar = useGuardarHorario();
  const [borrador, setBorrador] = useState<Horario | null>(null);
  const editable = esAdmin && listo;
  const h = borrador ?? horario;

  const cambiarAula = (aula: AulaCodigo, f: (bloques: BloqueHorario[]) => BloqueHorario[]) =>
    setBorrador({ ...h, [aula]: f(h[aula]) });
  const editar = (aula: AulaCodigo, i: number, cambio: Partial<BloqueHorario>) =>
    cambiarAula(aula, (bs) => bs.map((b, j) => (j === i ? { ...b, ...cambio } : b)));

  const enviar = async () => {
    for (const a of CODIGOS_AULA) {
      const malo = h[a].find((b) => b.inicio >= b.fin);
      if (malo) {
        toast.error(`Bloque inválido en ${a}: "${malo.curso}" empieza ${malo.inicio} y termina ${malo.fin}.`);
        return;
      }
    }
    try {
      await guardar.mutateAsync({ nuevo: h, actual: horario });
    } catch (e) {
      toast.error(mensajeDeError(e, "No se pudo guardar el horario."));
      return;
    }
    setBorrador(null);
    toast.success("Horario guardado.");
  };

  return (
    <SectionCard icon={ClockIcon} title="Horario semanal">
      {CODIGOS_AULA.map((a) => (
        <div key={a}>
          <h3 className="mb-2 text-sm font-medium">{a}</h3>
          <div className="flex flex-col gap-2">
            {h[a].map((b, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <SelectSimple
                  value={String(b.dia)}
                  onChange={(v) => editar(a, i, { dia: Number(v) })}
                  opciones={OPCIONES_DIA}
                  className="w-32"
                  ariaLabel="Día"
                  disabled={!editable}
                />
                {(
                  [
                    ["inicio", "Hora de inicio", "time", "w-28"],
                    ["fin", "Hora de fin", "time", "w-28"],
                    ["curso", "Curso", "text", "w-48 flex-1"],
                  ] as const
                ).map(([campo, etiqueta, tipo, clase]) => (
                  <Input
                    key={campo}
                    type={tipo}
                    className={clase}
                    value={b[campo]}
                    disabled={!editable}
                    onChange={(e) => editar(a, i, { [campo]: e.target.value })}
                    aria-label={etiqueta}
                  />
                ))}
                {editable && (
                  <Button variant="ghost" size="sm" onClick={() => cambiarAula(a, (bs) => bs.filter((_, j) => j !== i))}>
                    Quitar
                  </Button>
                )}
              </div>
            ))}
            {editable && (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => cambiarAula(a, (bs) => [...bs, BLOQUE_NUEVO])}
              >
                + Agregar bloque
              </Button>
            )}
          </div>
        </div>
      ))}
      <div>
        <Button onClick={enviar} disabled={!editable || !borrador}>
          Guardar horario
        </Button>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------

interface Contactos {
  moderador: string;
  seguridad: string;
}

const CONTACTOS_VACIOS: Contactos = { moderador: "", seguridad: "" };

const CAMPOS_CONTACTO: { clave: keyof Contactos; etiqueta: string }[] = [
  { clave: "moderador", etiqueta: "Moderador (aforo excedido)" },
  { clave: "seguridad", etiqueta: "Seguridad (proximidad a ventana)" },
];

export function SeccionContactos() {
  const esAdmin = useEsAdmin();
  const autorizar = useApp((s) => s.autorizar);
  const guardados = useLocal("contactos", CONTACTOS_VACIOS);
  const [borrador, setBorrador] = useState<Contactos | null>(null);
  const contactos = borrador ?? guardados;

  const guardar = async () => {
    if (!(await autorizar("gestionar_dispositivos"))) return;
    saveLocal("contactos", contactos);
    toast.success("Contactos guardados.");
  };

  return (
    <SectionCard icon={UsersIcon} title="Contactos de notificación" contentClassName="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {CAMPOS_CONTACTO.map(({ clave, etiqueta }) => (
          <Campo key={clave} id={clave} label={etiqueta}>
            <Input
              id={clave}
              type="email"
              placeholder={`${clave}@utec.edu.pe`}
              value={contactos[clave]}
              disabled={!esAdmin}
              onChange={(e) => setBorrador({ ...contactos, [clave]: e.target.value })}
            />
          </Campo>
        ))}
      </div>
      <div>
        <Button onClick={guardar} disabled={!esAdmin}>
          Guardar contactos
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        En fase 1 los contactos solo se guardan localmente; el envío real de correo/Telegram llega con la fase 2.
      </p>
    </SectionCard>
  );
}
