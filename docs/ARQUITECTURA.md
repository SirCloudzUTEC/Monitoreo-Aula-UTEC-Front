# Arquitectura

## Vista general

```
┌────────────────────────── Navegador (PWA) ──────────────────────────┐
│  UI Next.js (App Router, React 19)                                  │
│  ├─ páginas: / /modulo /alertas /pantalla /aula /importar /log      │
│  │            /simulador /ajustes                                   │
│  ├─ Zustand store (src/lib/store.ts)                                │
│  │    reloj simulado (1×/10×/60×) → cada 5 s simulados:             │
│  │    SimulatedDataSource → mediciones → RuleEngine → eventos       │
│  │    → toasts / push / log                                         │
│  ├─ persistencia: localStorage (config) + IndexedDB (log 90 días)   │
│  └─ service worker (public/sw.js): offline + Web Push               │
└──────────────┬──────────────────────────────────────────────────────┘
               │ HTTP (JSON)
┌──────────────▼──────────────── Vercel (serverless) ─────────────────┐
│  API routes *stateless* (replican el simulador determinista):       │
│  /api/mediciones /api/serie /api/estado /api/eventos                │
│  /api/umbrales (POST solo administrador) /api/push/send|subscribe   │
└─────────────────────────────────────────────────────────────────────┘
```

## Capas (src/)

| Capa | Carpeta | Rol |
| --- | --- | --- |
| Tipos de dominio | `lib/types.ts` | Contratos SysML (SYS-09.2, SYS-10.1) |
| Datos semilla | `data/*.json` | Aulas, sensores/nodos, umbrales, horario |
| Simulador | `lib/simulator/` | Perfiles puros por magnitud + generador de ticks 5 s |
| Reglas | `lib/rules/engine.ts` | Persistencia, histéresis, watchdogs, máquina de estados |
| Eventos | `lib/events/` | Catálogo en español + log CSV/huella/retención |
| Anomalías | `lib/anomaly/` | z-score, salto brusco, isolation forest (F9) |
| Datos | `lib/data/` | `DataSource` (simulado hoy, MQTT mañana), storage |
| Notificación | `lib/notify/` | Adaptador de canales: push real, email/telegram stubs |
| Estado global | `lib/store.ts` | Reloj sim, acuses, inyección, escenarios |
| UI | `app/`, `components/` | Páginas y componentes (shadcn/ui + Recharts) |

## Flujo de un tick

1. Cada segundo real, el store calcula cuántos ticks de 5 s simulados pasaron
   (según velocidad ×1/×10/×60) y los procesa en orden.
2. `SimulatedDataSource.medicionesActuales()` produce las mediciones SYS-09.2 del tick.
3. `RuleEngine.process()` evalúa cada medición: persistencias, histéresis y umbral;
   `RuleEngine.tick()` maneja inicio/fin de clase y watchdogs de latido.
4. Los eventos emitidos van al log (IndexedDB), a toasts y, si son críticos, a push.
5. El estado del aula (Cerrada/Libre/EnClase/Alerta) se deriva de horario + alertas
   abiertas sin acusar.

## Máquina de estados del aula

```
Cerrada ──(horario 07-22)──► Libre ──(bloque de clase)──► EnClase
   ▲                            │                            │
   └────────(22:00)─────────────┘        evento sin acusar   ▼
                                    ◄──(acuse/cierre)──── Alerta
```

## Conexión futura a hardware (fase 2)

- `MqttDataSource` (en `lib/data/data-source.ts`) se conecta a
  `NEXT_PUBLIC_MQTT_WS_URL` y se suscribe a `utec/aula/+/+/+` (QoS 1).
- El payload MQTT ya es el formato SYS-09.2, así que ni el motor ni la UI cambian.
- Topic: `utec/aula/{codigo}/{nodo}/{magnitud}` (ver `topicMqtt()` en el generador).
