"use client";

// Device roster (`/api/dispositivos`): the Raspberry Pi nodes that publish over MQTT. Registering a
// node (or rotating its credential) returns the MQTT password ONCE — the backend keeps it only in
// the broker — so it is shown in a card that has to be dismissed. A node can be blocked at any time
// (ingestion rejects it and its MQTT login is disabled at the broker) and re-enabled later.

import { useState } from "react";
import { CpuIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccesoRequerido, PageHeader, SectionCard } from "@/components/common/layout";
import { AulaSelect, Campo, SelectSimple, opcionesDe } from "@/components/common/form";
import { DataTable, EstadoLista, type Columna } from "@/components/common/data-table";
import { SecretoUnaVez } from "@/components/common/secreto-una-vez";
import { AVISO_LATIDO_MS, nodosAdmitidos } from "@/lib/dispositivos";
import {
  actualizarDispositivo,
  registrarDispositivo,
  rotarCredencial,
  type CredencialDispositivo,
  type Dispositivo,
} from "@/lib/api/endpoints";
import { useDispositivos, useMutacionAdmin } from "@/lib/api/hooks";
import { CODIGOS_AULA } from "@/lib/aulas";
import { fechaHoraDeIso, haceCuanto } from "@/lib/format";
import { useOnline } from "@/lib/use-online";
import type { AulaCodigo } from "@/lib/types";

/** Wording of the block/unblock action, by the node's current `activo`. */
const ACCION_ACTIVO = {
  true: { estado: "Activo", boton: "Bloquear", confirmar: "¿Bloquear %s? Dejará de aceptarse su telemetría." },
  false: { estado: "Bloqueado", boton: "Activar", confirmar: "¿Volver a activar %s?" },
} as const;

export default function DispositivosPage() {
  return (
    <AccesoRequerido
      permiso="gestionar_dispositivos"
      mensaje="Solo una cuenta administradora puede gestionar dispositivos."
    >
      <Dispositivos />
    </AccesoRequerido>
  );
}

function Dispositivos() {
  const online = useOnline();
  const [aula, setAula] = useState<AulaCodigo>(CODIGOS_AULA[0]);
  const [nodo, setNodo] = useState<string>("nodoAmbiental");
  const [credencial, setCredencial] = useState<CredencialDispositivo | null>(null);

  const lista = useDispositivos();
  const dispositivos = lista.data ?? [];

  const registrar = useMutacionAdmin({ fn: registrarDispositivo, invalidar: "dispositivos", alTerminar: setCredencial });
  const rotar = useMutacionAdmin({ fn: rotarCredencial, invalidar: "dispositivos", alTerminar: setCredencial });
  const activar = useMutacionAdmin({
    fn: (v: { id: number; activo: boolean }) => actualizarDispositivo(v.id, v.activo),
    invalidar: "dispositivos",
    ok: (d) => (d.activo ? "Dispositivo activado." : "Dispositivo bloqueado."),
  });

  const registrados = new Set(dispositivos.filter((d) => d.aula === aula).map((d) => d.nodo));
  const opciones = nodosAdmitidos(aula).filter((n) => !registrados.has(n));
  const nodoElegido = opciones.includes(nodo) ? nodo : (opciones[0] ?? "");

  const columnas: Columna<Dispositivo>[] = [
    { titulo: "Aula", celda: (d) => d.aula },
    { titulo: "Nodo", celda: (d) => d.nodo },
    { titulo: "Usuario MQTT", className: "font-mono text-xs", celda: (d) => d.mqttUsername },
    { titulo: "Estado", celda: (d) => ACCION_ACTIVO[`${d.activo}`].estado },
    {
      titulo: "Último latido",
      className: "text-xs",
      celda: (d) => {
        if (!d.ultimoLatidoEn) return "nunca";
        // age at the moment the roster was fetched (pure: no clock read while rendering)
        const edad = lista.dataUpdatedAt - new Date(d.ultimoLatidoEn).getTime();
        return (
          <span className={edad > AVISO_LATIDO_MS ? "text-amber-600" : undefined}>
            {fechaHoraDeIso(d.ultimoLatidoEn)} ({haceCuanto(edad)})
          </span>
        );
      },
    },
    {
      titulo: "Acciones",
      celda: (d) => {
        const nombre = `${d.aula} · ${d.nodo}`;
        const accion = ACCION_ACTIVO[`${d.activo}`];
        return (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={!online || rotar.isPending}
              onClick={() =>
                window.confirm(`¿Generar una nueva credencial para ${nombre}? La anterior dejará de servir.`) &&
                rotar.mutate(d.id)
              }
            >
              Rotar credencial
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!online || activar.isPending}
              onClick={() =>
                window.confirm(accion.confirmar.replace("%s", nombre)) && activar.mutate({ id: d.id, activo: !d.activo })
              }
            >
              {accion.boton}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader icon={CpuIcon} title="Dispositivos" />

      {credencial && (
        <SecretoUnaVez
          filas={[
            { etiqueta: "Usuario", valor: credencial.mqttUsername },
            { etiqueta: "Contraseña", valor: credencial.mqttPassword },
          ]}
          onCerrar={() => setCredencial(null)}
        >
          Credencial MQTT de{" "}
          <strong>
            {credencial.aula} · {credencial.nodo}
          </strong>
          . Cárgala en la Raspberry Pi ahora: <strong>no se volverá a mostrar</strong>.
        </SecretoUnaVez>
      )}

      <SectionCard icon={PlusIcon} title="Registrar dispositivo" contentClassName="">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (nodoElegido) registrar.mutate({ aula, nodo: nodoElegido });
          }}
        >
          <Campo id="disp-aula" label="Aula">
            <AulaSelect id="disp-aula" value={aula} onChange={setAula} />
          </Campo>
          <Campo id="disp-nodo" label="Nodo">
            <SelectSimple
              id="disp-nodo"
              value={nodoElegido}
              onChange={setNodo}
              opciones={opcionesDe(opciones)}
              className="w-52"
              placeholder="Todos registrados"
              disabled={opciones.length === 0}
            />
          </Campo>
          <Button type="submit" disabled={!online || !nodoElegido || registrar.isPending}>
            {registrar.isPending ? "Registrando…" : "Registrar y generar credencial"}
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Requiere que el broker MQTT esté conectado al backend: si no confirma la credencial, no se registra nada.
        </p>
      </SectionCard>

      <SectionCard title="Dispositivos registrados" contentClassName="overflow-x-auto">
        <EstadoLista
          cargando={lista.isPending}
          vacio={dispositivos.length === 0}
          mensajeVacio="Todavía no hay dispositivos."
          skeleton={{ filas: 4, columnas: 5 }}
        >
          <DataTable columnas={columnas} filas={dispositivos} clave={(d) => d.id} />
        </EstadoLista>
      </SectionCard>
    </div>
  );
}
