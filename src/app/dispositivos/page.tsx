"use client";

// Device roster (`/api/dispositivos`): the Raspberry Pi nodes that publish over MQTT. Registering a
// node (or rotating its credential) returns the MQTT password ONCE — the backend keeps it only in
// the broker — so it is shown in a card that has to be dismissed. A node can be blocked at any time
// (ingestion rejects it and its MQTT login is disabled at the broker) and re-enabled later.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { CpuIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AVISO_LATIDO_MS, nodosAdmitidos } from "@/app/dispositivos/nodos";
import { haceCuanto } from "@/components/modules/aviso-obsoleto";
import {
  actualizarDispositivo,
  listarDispositivos,
  registrarDispositivo,
  rotarCredencial,
  type CredencialDispositivo,
} from "@/lib/api/endpoints";
import { mensajeDeError } from "@/lib/api/client";
import { useHabilitado } from "@/lib/api/hooks";
import { CODIGOS_AULA } from "@/lib/aulas";
import { fechaHoraDeIso } from "@/lib/format";
import { useApp } from "@/lib/store";
import { useOnline } from "@/lib/use-online";
import type { AulaCodigo } from "@/lib/types";

export default function DispositivosPage() {
  const cuenta = useApp((s) => s.cuenta);
  const habilitado = useHabilitado("gestionar_dispositivos");
  const online = useOnline();
  const qc = useQueryClient();
  const [aula, setAula] = useState<AulaCodigo>(CODIGOS_AULA[0]);
  const [nodo, setNodo] = useState<string>("nodoAmbiental");
  const [credencial, setCredencial] = useState<CredencialDispositivo | null>(null);

  const lista = useQuery({
    queryKey: ["dispositivos"],
    queryFn: listarDispositivos,
    enabled: habilitado,
    refetchInterval: 30_000,
  });
  const dispositivos = lista.data ?? [];
  const refrescar = () => qc.invalidateQueries({ queryKey: ["dispositivos"] });
  const alFallar = (e: unknown) => toast.error(mensajeDeError(e, "No se pudo completar la acción."));

  const registrar = useMutation({
    mutationFn: registrarDispositivo,
    onSuccess: (c) => {
      setCredencial(c);
      void refrescar();
    },
    onError: alFallar,
  });
  const rotar = useMutation({
    mutationFn: rotarCredencial,
    onSuccess: (c) => setCredencial(c),
    onError: alFallar,
  });
  const activar = useMutation({
    mutationFn: (v: { id: number; activo: boolean }) => actualizarDispositivo(v.id, v.activo),
    onSuccess: (d) => {
      toast.success(d.activo ? "Dispositivo activado." : "Dispositivo bloqueado.");
      void refrescar();
    },
    onError: alFallar,
  });

  const registrados = new Set(dispositivos.filter((d) => d.aula === aula).map((d) => d.nodo));
  const opciones = nodosAdmitidos(aula).filter((n) => !registrados.has(n));
  const nodoElegido = opciones.includes(nodo) ? nodo : (opciones[0] ?? "");

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Copiado.");
    } catch {
      toast.error("No se pudo copiar. Selecciónala manualmente.");
    }
  };

  if (!cuenta || !habilitado) {
    return (
      <div className="mx-auto max-w-lg py-8 text-center text-sm text-muted-foreground">
        Solo una cuenta administradora puede gestionar dispositivos.{" "}
        {!cuenta && (
          <Link href="/acceso" className="underline">
            Inicia sesión
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <CpuIcon className="size-7 text-primary" aria-hidden />
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Dispositivos</h1>
      </div>

      {credencial && (
        <div className="space-y-2 rounded-md border border-emerald-300/50 bg-emerald-50 px-3 py-3 text-sm text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950/40 dark:text-emerald-200">
          <p>
            Credencial MQTT de <strong>{credencial.aula} · {credencial.nodo}</strong>. Cárgala en la
            Raspberry Pi ahora: <strong>no se volverá a mostrar</strong>.
          </p>
          <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1">
            <dt className="text-xs">Usuario</dt>
            <dd>
              <code className="rounded bg-background/60 px-2 py-1 font-mono text-sm">{credencial.mqttUsername}</code>
            </dd>
            <dd>
              <Button size="sm" variant="outline" onClick={() => void copiar(credencial.mqttUsername)}>
                Copiar
              </Button>
            </dd>
            <dt className="text-xs">Contraseña</dt>
            <dd>
              <code className="break-all rounded bg-background/60 px-2 py-1 font-mono text-sm">
                {credencial.mqttPassword}
              </code>
            </dd>
            <dd>
              <Button size="sm" variant="outline" onClick={() => void copiar(credencial.mqttPassword)}>
                Copiar
              </Button>
            </dd>
          </dl>
          <Button size="sm" variant="ghost" onClick={() => setCredencial(null)}>
            Entendido
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <PlusIcon className="size-4" aria-hidden /> Registrar dispositivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (nodoElegido) registrar.mutate({ aula, nodo: nodoElegido });
            }}
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="disp-aula" className="text-xs text-muted-foreground">
                Aula
              </Label>
              <Select value={aula} onValueChange={(v) => setAula(v as AulaCodigo)}>
                <SelectTrigger id="disp-aula" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CODIGOS_AULA.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="disp-nodo" className="text-xs text-muted-foreground">
                Nodo
              </Label>
              <Select value={nodoElegido} onValueChange={setNodo} disabled={opciones.length === 0}>
                <SelectTrigger id="disp-nodo" className="w-52">
                  <SelectValue placeholder="Todos registrados" />
                </SelectTrigger>
                <SelectContent>
                  {opciones.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={!online || !nodoElegido || registrar.isPending}>
              {registrar.isPending ? "Registrando…" : "Registrar y generar credencial"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Requiere que el broker MQTT esté conectado al backend: si no confirma la credencial, no se registra nada.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Dispositivos registrados</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {lista.isPending ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : dispositivos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay dispositivos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aula</TableHead>
                  <TableHead>Nodo</TableHead>
                  <TableHead>Usuario MQTT</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último latido</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispositivos.map((d) => {
                  // age at the moment the roster was fetched (pure: no clock read while rendering)
                  const edad = d.ultimoLatidoEn ? lista.dataUpdatedAt - new Date(d.ultimoLatidoEn).getTime() : null;
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{d.aula}</TableCell>
                      <TableCell>{d.nodo}</TableCell>
                      <TableCell className="font-mono text-xs">{d.mqttUsername}</TableCell>
                      <TableCell>{d.activo ? "Activo" : "Bloqueado"}</TableCell>
                      <TableCell className="text-xs">
                        {d.ultimoLatidoEn ? (
                          <span className={edad !== null && edad > AVISO_LATIDO_MS ? "text-amber-600" : undefined}>
                            {fechaHoraDeIso(d.ultimoLatidoEn)} ({edad !== null ? haceCuanto(edad) : ""})
                          </span>
                        ) : (
                          "nunca"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!online || rotar.isPending}
                            onClick={() => {
                              if (window.confirm(`¿Generar una nueva credencial para ${d.aula} · ${d.nodo}? La anterior dejará de servir.`))
                                rotar.mutate(d.id);
                            }}
                          >
                            Rotar credencial
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!online || activar.isPending}
                            onClick={() => {
                              const msg = d.activo
                                ? `¿Bloquear ${d.aula} · ${d.nodo}? Dejará de aceptarse su telemetría.`
                                : `¿Volver a activar ${d.aula} · ${d.nodo}?`;
                              if (window.confirm(msg)) activar.mutate({ id: d.id, activo: !d.activo });
                            }}
                          >
                            {d.activo ? "Bloquear" : "Activar"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
