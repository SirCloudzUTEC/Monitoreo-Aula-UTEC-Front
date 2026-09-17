"use client";

// F8 — settings: account (Auth.js), thresholds (validated by the API,
// criterio 7), weekly schedule, contacts, push notifications and sound.
// Every change is confirmed and logged with the signed-in account's email.

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  BellIcon,
  ClockIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp, CODIGOS_AULA } from "@/lib/store";
import { puede } from "@/lib/auth/identity";
import { loadLocal, saveLocal } from "@/lib/data/storage";
import { DIAS_SEMANA } from "@/lib/schedule";
import {
  desuscribirPush,
  probarPush,
  pushSoportado,
  suscribirPush,
  suscripcionActual,
} from "@/lib/notify/push-client";
import type { AulaCodigo, BloqueHorario, Horario, Umbrales } from "@/lib/types";
import { useOnline } from "@/lib/use-online";

interface CampoUmbral {
  key: keyof Umbrales;
  etiqueta: string;
}

const GRUPOS_UMBRALES: { titulo: string; campos: CampoUmbral[] }[] = [
  {
    titulo: "Confort térmico",
    campos: [
      { key: "umbralTemp", etiqueta: "Temperatura máx (°C)" },
      { key: "umbralTempHisteresis", etiqueta: "Histéresis temperatura (°C)" },
      {
        key: "umbralTempPersistenciaMin",
        etiqueta: "Persistencia temperatura (min)",
      },
      { key: "hrMin", etiqueta: "Humedad mín (%)" },
      { key: "hrMax", etiqueta: "Humedad máx (%)" },
      { key: "hrPersistenciaMin", etiqueta: "Persistencia humedad (min)" },
    ],
  },
  {
    titulo: "Iluminación",
    campos: [
      { key: "umbralLux", etiqueta: "Lux mín en clase (lx)" },
      { key: "luxObjetivo", etiqueta: "Lux objetivo (lx)" },
      { key: "luxPersistenciaMin", etiqueta: "Persistencia iluminación (min)" },
    ],
  },
  {
    titulo: "Calidad de aire",
    campos: [
      { key: "co2Aviso", etiqueta: "CO₂ aviso (ppm)" },
      { key: "co2Alerta", etiqueta: "CO₂ alerta (ppm)" },
      { key: "co2PersistenciaMin", etiqueta: "Persistencia CO₂ (min)" },
      { key: "pm25Max", etiqueta: "PM2.5 máx (µg/m³)" },
      { key: "pm25PersistenciaMin", etiqueta: "Persistencia PM2.5 (min)" },
    ],
  },
  {
    titulo: "Ruido",
    campos: [{ key: "umbralRuido", etiqueta: "Ruido máx (dBA, LAeq 1 min)" }],
  },
  {
    titulo: "Aforo y accesos",
    campos: [
      { key: "aforoMaximo", etiqueta: "Aforo máximo (personas)" },
      {
        key: "puertaAbiertaMaxEnClaseMin",
        etiqueta: "Puerta abierta máx en clase (min)",
      },
      {
        key: "puertaAbiertaMaxFueraHorarioMin",
        etiqueta: "Puerta abierta máx fuera de horario (min)",
      },
    ],
  },
  {
    titulo: "Perímetro de ventanas",
    campos: [
      { key: "distVentana", etiqueta: "Distancia mínima (m)" },
      { key: "distVentanaHisteresis", etiqueta: "Histéresis distancia (m)" },
      { key: "distVentanaPersistenciaSeg", etiqueta: "Persistencia (s)" },
    ],
  },
  {
    titulo: "Salud de nodos",
    campos: [
      { key: "bateriaBaja", etiqueta: "Batería baja (%)" },
      { key: "latidoMin", etiqueta: "Periodo de latido (min)" },
      { key: "nodoSinDatosMin", etiqueta: "Nodo sin datos tras (min)" },
      { key: "procesadorOfflineSeg", etiqueta: "Procesador offline tras (s)" },
    ],
  },
];

interface Contactos {
  moderador: string;
  seguridad: string;
}

const subscribeToCapabilities = () => () => {};
const serverPushSnapshot = () => false;

export default function AjustesPage() {
  const supportsPush = useSyncExternalStore(
    subscribeToCapabilities,
    pushSoportado,
    serverPushSnapshot,
  );
  const cuenta = useApp((s) => s.cuenta);
  const autorizar = useApp((s) => s.autorizar);
  const sonido = useApp((s) => s.sonido);
  const setSonido = useApp((s) => s.setSonido);
  const umbrales = useApp((s) => s.umbrales);
  const setUmbrales = useApp((s) => s.setUmbrales);
  const horario = useApp((s) => s.horario);
  const setHorario = useApp((s) => s.setHorario);

  const online = useOnline();
  const esAdmin =
    online && (cuenta ? puede(cuenta, "gestionar_dispositivos") : false);
  const puedeRecibirAlertas =
    online && (cuenta ? puede(cuenta, "recibir_alertas") : false);
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [horarioBorrador, setHorarioBorrador] = useState<Horario | null>(null);
  const [contactos, setContactos] = useState<Contactos>({
    moderador: "",
    seguridad: "",
  });
  const [pushActivo, setPushActivo] = useState(false);

  useEffect(() => {
    // client-only reads after mount (SSR renders defaults)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContactos(
      loadLocal<Contactos>("contactos", { moderador: "", seguridad: "" }),
    );
    void suscripcionActual().then((s) => setPushActivo(Boolean(s)));
  }, []);

  const valorCampo = (k: keyof Umbrales): string =>
    borrador[k] ?? String(umbrales[k]);

  const guardarUmbrales = async () => {
    const nuevos = { ...umbrales };
    for (const g of GRUPOS_UMBRALES) {
      for (const c of g.campos) {
        const v = Number(valorCampo(c.key));
        if (!Number.isFinite(v) || v < 0) {
          toast.error(`Valor inválido en "${c.etiqueta}".`);
          return;
        }
        nuevos[c.key] = v;
      }
    }
    // the API authorizes and validates (criterio 7: rejects non-admin writes)
    const res = await fetch("/api/umbrales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevos),
    }).catch(() => null);
    if (!res) {
      toast.error("Sin conexión: no se guardaron los cambios.");
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      toast.error(
        data?.error ?? `La API rechazó el cambio (HTTP ${res.status}).`,
      );
      return;
    }
    if (!(await setUmbrales(nuevos))) return;
    setBorrador({});
    toast.success("Umbrales guardados y registrados en el log.");
  };

  const h = horarioBorrador ?? horario;
  const editarBloque = (
    aula: AulaCodigo,
    i: number,
    cambio: Partial<BloqueHorario>,
  ) => {
    const copia: Horario = {
      ...h,
      [aula]: h[aula].map((b, j) => (j === i ? { ...b, ...cambio } : b)),
    };
    setHorarioBorrador(copia);
  };
  const quitarBloque = (aula: AulaCodigo, i: number) => {
    setHorarioBorrador({ ...h, [aula]: h[aula].filter((_, j) => j !== i) });
  };
  const agregarBloque = (aula: AulaCodigo) => {
    setHorarioBorrador({
      ...h,
      [aula]: [
        ...h[aula],
        { dia: 1, inicio: "08:00", fin: "10:00", curso: "Nuevo curso" },
      ],
    });
  };
  const guardarHorario = async () => {
    for (const a of CODIGOS_AULA) {
      for (const b of h[a]) {
        if (b.inicio >= b.fin) {
          toast.error(
            `Bloque inválido en ${a}: "${b.curso}" empieza ${b.inicio} y termina ${b.fin}.`,
          );
          return;
        }
      }
    }
    if (!(await setHorario(h))) return;
    setHorarioBorrador(null);
    toast.success("Horario guardado y registrado en el log.");
  };

  const guardarContactos = async () => {
    if (!(await autorizar("gestionar_dispositivos"))) return;
    saveLocal("contactos", contactos);
    toast.success("Contactos guardados.");
  };

  const activarPush = async () => {
    try {
      await suscribirPush();
      setPushActivo(true);
      toast.success("Notificaciones push activadas en este navegador.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo activar el push.",
      );
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Settings2Icon className="size-7 text-primary" aria-hidden />
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Ajustes</h1>
      </div>

      {/* account */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheckIcon className="size-4" aria-hidden /> Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {cuenta ? (
            <>
              <p className="text-sm">
                {cuenta.nombre || cuenta.email} ({cuenta.email}) · rol{" "}
                <strong className="capitalize">{cuenta.rol}</strong> · estado{" "}
                <strong className="capitalize">{cuenta.estado}</strong>
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void signOut({ callbackUrl: "/acceso" })}
              >
                Cerrar sesión
              </Button>
              {cuenta.estado !== "aprobada" && (
                <p className="w-full text-xs text-muted-foreground">
                  Tu cuenta está {cuenta.estado}: la administración debe
                  aprobarla antes de que puedas editar datos.
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
            Solo un superadmin puede editar umbrales, horario y usar el
            simulador. La app no captura imágenes ni audio.
          </p>
        </CardContent>
      </Card>

      {/* notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BellIcon className="size-4" aria-hidden /> Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Switch id="sonido" checked={sonido} onCheckedChange={setSonido} />
            <Label htmlFor="sonido">Sonido en alertas críticas</Label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pushActivo ? (
              <>
                <span className="text-sm text-emerald-700 dark:text-emerald-400">
                  ✓ Push activo en este navegador
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!esAdmin}
                  onClick={async () => {
                    const err = await probarPush();
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
              <Button
                size="sm"
                onClick={activarPush}
                disabled={!supportsPush || !puedeRecibirAlertas}
              >
                Activar notificaciones push
              </Button>
            )}
            {!supportsPush && (
              <span className="text-xs text-muted-foreground">
                Este navegador no soporta Web Push.
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Canales adicionales (correo, Telegram) quedan listos como
            adaptadores para la fase 2.
          </p>
        </CardContent>
      </Card>

      {/* thresholds */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">
            Umbrales de confort y seguridad
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!esAdmin && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Solo lectura: necesitas una cuenta superadmin para editar.
            </p>
          )}
          {GRUPOS_UMBRALES.map((g) => (
            <fieldset key={g.titulo} className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-1 text-sm font-medium">{g.titulo}</legend>
              {g.campos.map((c) => (
                <div key={c.key} className="flex flex-col gap-1">
                  <Label
                    htmlFor={c.key}
                    className="text-xs text-muted-foreground"
                  >
                    {c.etiqueta}
                  </Label>
                  <Input
                    id={c.key}
                    type="number"
                    step="any"
                    min={0}
                    disabled={!esAdmin}
                    value={valorCampo(c.key)}
                    onChange={(e) =>
                      setBorrador((b) => ({ ...b, [c.key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </fieldset>
          ))}
          <div>
            <Button onClick={guardarUmbrales} disabled={!esAdmin}>
              Guardar umbrales
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* weekly schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ClockIcon className="size-4" aria-hidden /> Horario semanal
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {CODIGOS_AULA.map((a) => (
            <div key={a}>
              <h3 className="mb-2 text-sm font-medium">{a}</h3>
              <div className="flex flex-col gap-2">
                {h[a].map((b, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <Select
                      value={String(b.dia)}
                      onValueChange={(v) =>
                        editarBloque(a, i, { dia: Number(v) })
                      }
                      disabled={!esAdmin}
                    >
                      <SelectTrigger className="w-32" aria-label="Día">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIAS_SEMANA.map((d, di) => (
                          <SelectItem key={di} value={String(di)}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="time"
                      className="w-28"
                      value={b.inicio}
                      disabled={!esAdmin}
                      onChange={(e) =>
                        editarBloque(a, i, { inicio: e.target.value })
                      }
                      aria-label="Hora de inicio"
                    />
                    <Input
                      type="time"
                      className="w-28"
                      value={b.fin}
                      disabled={!esAdmin}
                      onChange={(e) =>
                        editarBloque(a, i, { fin: e.target.value })
                      }
                      aria-label="Hora de fin"
                    />
                    <Input
                      className="w-48 flex-1"
                      value={b.curso}
                      disabled={!esAdmin}
                      onChange={(e) =>
                        editarBloque(a, i, { curso: e.target.value })
                      }
                      aria-label="Curso"
                    />
                    {esAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => quitarBloque(a, i)}
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                ))}
                {esAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => agregarBloque(a)}
                  >
                    + Agregar bloque
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div>
            <Button
              onClick={guardarHorario}
              disabled={!esAdmin || !horarioBorrador}
            >
              Guardar horario
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* contacts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <UsersIcon className="size-4" aria-hidden /> Contactos de
            notificación
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="moderador"
                className="text-xs text-muted-foreground"
              >
                Moderador (aforo excedido)
              </Label>
              <Input
                id="moderador"
                type="email"
                placeholder="moderador@utec.edu.pe"
                value={contactos.moderador}
                disabled={!esAdmin}
                onChange={(e) =>
                  setContactos((c) => ({ ...c, moderador: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="seguridad"
                className="text-xs text-muted-foreground"
              >
                Seguridad (proximidad a ventana)
              </Label>
              <Input
                id="seguridad"
                type="email"
                placeholder="seguridad@utec.edu.pe"
                value={contactos.seguridad}
                disabled={!esAdmin}
                onChange={(e) =>
                  setContactos((c) => ({ ...c, seguridad: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <Button onClick={guardarContactos} disabled={!esAdmin}>
              Guardar contactos
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            En fase 1 los contactos solo se guardan localmente; el envío real de
            correo/Telegram llega con la fase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
