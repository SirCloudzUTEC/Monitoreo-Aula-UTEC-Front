# Mejoras de UX y velocidad percibida — Panel del administrador

> Complementa `recomendaciones.md` (parte de ese documento quedó desactualizada: menciona el simulador y el reloj simulado, que ya no existen tras el refactor a backend). Este documento **no cambia el diseño visual**: solo la carga, el orden y dos bloques nuevos arriba del dashboard.

## 1. Resumen

- La interfaz se siente lenta sobre todo por **lentitud percibida**, no por el servidor: una pantalla de "Cargando…" bloqueante, datos falsos mientras llega la información real, ~20 requests simultáneas al abrir `/` y re-renders constantes.
- Un administrador hoy tiene que **entrar a 3 rutas distintas** (`/alertas`, `/reportes`, `/dispositivos`) para saber si algo requiere su atención. El dashboard solo muestra un conteo en texto.
- Propuesta: **dos bloques nuevos arriba del dashboard** con alertas e información importante para el admin, más un conjunto priorizado de mejoras de carga.

## 2. Alcance y regla de oro

| Se agrega / cambia | Se queda **exactamente igual** |
|---|---|
| Dos bloques nuevos (sección 3), visibles solo para roles con permiso de admin (`superadmin`, `admin_operativo`) | Encabezado "Panel general" |
| Skeletons y estados de carga en lugar de textos/valores falsos | Sección "Aulas en riesgo" y `AulaSummaryCard` |
| Optimización de fetch, render y bundle (sección 4) | Sección "Módulos de monitoreo" y `ModuleCard` |
| | Header, sidebar, bottom bar móvil, colores, tipografía, textos, rutas y navegación |
| | El dashboard del rol `miembro` |

## 3. Los 2 bloques superiores del admin

Posición: **justo debajo del encabezado "Panel general" y encima de "Aulas en riesgo"** (`src/app/page.tsx`). Todo lo que ya existe baja debajo de ellos sin modificarse.

```
┌ Panel general ─────────────────────────────────────────────┐   (sin cambios)
│ 12:04:31 · 1 aula libre · 3 alertas sin acuse              │
├────────────────────────────────────────────────────────────┤
│ BLOQUE 1 · Alertas que requieren acción            Ver todas →│
│ ● CRÍTICO  CO₂ 1850 ppm · L-419 · hace 12 min  [ESCALADA]  [Acusar recibo] │
│ ● ALERTA   Aforo excedido · A-1001 · hace 3 min           [Acusar recibo] │
├────────────────────────────────────────────────────────────┤
│ BLOQUE 2 · Salud operativa                                 │
│ [ 2 incidentes sin atender → ] [ 1 nodo sin latido → ]      │
│ [ 1 aula con datos obsoletos ] [ Datos en vivo ✓ ]          │
├────────────────────────────────────────────────────────────┤
│ Aulas en riesgo (2)                                        │   (sin cambios)
│ Módulos de monitoreo                                       │   (sin cambios)
└────────────────────────────────────────────────────────────┘
```

### Bloque 1 — Alertas que requieren acción

**Qué muestra**
- Eventos abiertos y sin acuse de severidad `critico` y `alerta`, ordenados por severidad y luego por antigüedad (más viejo primero).
- Etiqueta **"Escalada"** en eventos `critico` con más de 10 min sin acuse; los de severidad `alerta` no escalan (`estaEscalado`, `src/lib/store.ts:113`). Hoy esto solo se ve dentro de `/alertas`.
- Botón **"Acusar recibo"** en línea, sin salir del dashboard (hoy solo existe en `/alertas`; referencia visual: `src/components/events/evento-card.tsx:88-109`).
- Máximo 3 filas visibles y un enlace "Ver todas" a `/alertas` con el total.

**Estados**
| Estado | Comportamiento |
|---|---|
| Cargando | Skeleton de 2 filas. **No** mostrar "sin alertas" mientras `isPending`. |
| Vacío (datos ya cargados) | Mensaje verde "Sin alertas pendientes". |
| Error | Mensaje discreto "No se pudieron cargar las alertas" con botón Reintentar. |

**Datos**: `useEventosAbiertos` (`src/lib/api/hooks.ts:132-143`), que **ya se consulta** en `/`. No agrega requests.

### Bloque 2 — Salud operativa

Fila de indicadores, cada uno accionable (clic lleva a la vista de detalle) y **oculto si el usuario no tiene el permiso**:

| Indicador | Fuente | Permiso | Enlace |
|---|---|---|---|
| Incidentes sin atender | `GET /api/incidentes` | `atender_incidentes` | `/reportes` |
| Nodos sin latido o bloqueados | `GET /api/dispositivos` y `AVISO_LATIDO_MS` (15 min, `nodos.ts`) | `gestionar_dispositivos` | `/dispositivos` |
| Aulas con datos obsoletos (>5 min sin lectura) | `useEstados` y la lógica de `AvisoObsoleto` (`aviso-obsoleto.tsx:39`) | — | `/aulas` |
| Conexión con el backend | `store.connected` | — | — |

**Estados**: skeleton de chips mientras carga; un indicador en 0 se muestra en verde y atenuado ("0 incidentes"), no desaparece, para que el admin vea que sí se revisó.

**Costo de red**: agrega 2 requests (`incidentes`, `dispositivos`) con polling de 30 s, igual que ya hacen `/reportes` y `/dispositivos`. A futuro conviene un endpoint agregado `GET /api/resumen-admin` (conteos) para evitar traer listas completas solo para contar.

### Reglas comunes
- Se renderizan solo si `cuenta.rol` es `superadmin` o `admin_operativo`.
- Aparecen **antes** que cualquier otra sección y no dependen de las series de los sparklines (deben pintarse primero).
- Deben respetar los colores y componentes existentes (`Badge`, semáforos de `src/lib/modules.ts`); no se introduce estilo nuevo.

## 4. Mejoras de velocidad percibida

### P0 — Mayor impacto, bajo esfuerzo

| # | Problema | Dónde | Cambio |
|---|---|---|---|
| 1 | Pantalla completa "Cargando…" que bloquea todo mientras corre `refresh` → `me` | `src/components/providers.tsx:41-80` (bloqueo en `:68-77`), `src/lib/api/session.ts:8-14` | Pintar el shell (header/sidebar) de inmediato y mostrar skeletons en el contenido; usar la última cuenta en caché para render optimista. |
| 2 | Valores falsos mientras carga: aulas "Cerrada", lecturas "—", "sin alertas pendientes" en verde | `src/lib/api/hooks.ts:61-66`, `src/app/page.tsx:60-71`, `src/lib/format.ts:24` | Distinguir `isPending` de "vacío": mostrar skeleton en tarjetas, chips del header y contador. Un admin no debe leer "sin alertas" antes de saberlo. |
| 3 | Al cambiar de rango (1h/24h/7d) los gráficos vuelven al skeleton | `src/lib/use-serie.ts:29-37` | `placeholderData: keepPreviousData` (ya se usa en `useEventosPagina`, `hooks.ts:178`). |
| 4 | Al paginar `/reportes` se pierde la lista | `src/app/reportes/page.tsx:50-55` | `keepPreviousData` + indicador sutil de "actualizando". |
| 5 | Solo texto "Cargando…" en tablas | `reportes/page.tsx:106-107`, `usuarios/page.tsx:277-278`, `dispositivos/page.tsx:219-220` | Skeleton de filas con el mismo alto que las reales (evita saltos de layout). |

### P1 — Alto impacto, esfuerzo medio

| # | Problema | Dónde | Cambio |
|---|---|---|---|
| 6 | `AppShell` se re-renderiza cada segundo por un `setInterval` y por `useEstados` | `src/components/layout/app-shell.tsx:107-118` | Extraer el reloj a un componente hoja; el shell no debe suscribirse a estados completos, solo a lo que pinta (selectores). |
| 7 | ~30 suscripciones al mismo estado; `combinarEstados` crea un objeto nuevo cada 5 s y provoca re-render de todo | `aula-summary-card.tsx:28-33`, `module-card.tsx:65-68`, `FilaAula` (`:38`) | `select` de TanStack Query y selectores de Zustand por aula/módulo; `React.memo` en `AulaSummaryCard`, `ModuleCard` y `FilaAula`; compartir referencias estables si el dato no cambió. |
| 8 | ~20 requests concurrentes al abrir `/` (14 series + estados + eventos + umbrales + horario) | `src/lib/use-serie.ts`, `hooks.ts:46-48,105-143` | Priorizar: primero bloques 1 y 2, aulas en riesgo y estados; **diferir las series de los sparklines** hasta que la tarjeta esté visible (IntersectionObserver) o tras el primer paint. |
| 9 | La escena 3D importa `classroom-scene` de forma estática y anula el `dynamic()` (ruta de 1.64 MB) | `src/app/aula/[codigo]/3d/page.tsx:26-31` | Mover `CAPAS_TODAS`, `NODO_META` y `buildLayout` a un módulo liviano fuera de `classroom-scene`. |
| 10 | `/` carga ~1.06 MB de JS; recharts entra completo para 8 sparklines diminutos | `sparkline.tsx:5`, `serie-chart.tsx`, `next.config.ts` | `next/dynamic` para recharts, `experimental.optimizePackageImports` (`radix-ui`, `lucide-react`, `recharts`), o reemplazar el sparkline por un SVG propio de pocas líneas. |

### P2 — Estructurales

| # | Problema | Dónde | Cambio |
|---|---|---|---|
| 11 | Una alerta crítica puede tardar hasta 15 s en aparecer (todo es polling) | `INTERVALO_EVENTOS_MS`, `hooks.ts:132-143` | SSE o WebSocket para eventos críticos; mientras tanto, bajar el intervalo solo para `critico`. |
| 12 | 14 requests de series individuales para 8 sparklines | `use-serie.ts` | Endpoint agregado del backend (una serie por aula con varias magnitudes). |
| 13 | El polling y el refetch al volver a la pestaña no distinguen importancia | `providers.tsx:24`, `hooks.ts` | Pausar polling con la pestaña oculta; `refetchOnWindowFocus` solo para estados y eventos; `staleTime` mayor para series. |
| 14 | Animaciones infinitas siempre visibles que fuerzan repintado | `globals.css:167-238`, `app-shell.tsx:210` (`.light-line`, `.glow-border`, `.glow-breathe`) | Animar solo `transform`/`opacity`, o desactivarlas en el dashboard; mantener `prefers-reduced-motion`. |
| 15 | `/alertas` pinta hasta 200 abiertas por severidad sin paginar | `hooks.ts:137,151` | Paginar o limitar a las más recientes con "cargar más". |
| 16 | `AvisoErrores` cuenta cada query fallida (un fallo repetido en 14 series = "14 conjuntos") | `src/components/layout/aviso-errores.tsx:22-27` | Deduplicar por endpoint o aula. |
| 17 | El service worker no acelera cargas online (network-first en todo) | `public/sw.js:70-98` | Stale-while-revalidate para assets estáticos. |
| 18 | Archivos sin uso en `public/` | `public/*.svg` de plantilla, `brand/utec-campus.png` (179 KB, sin referencias) | Eliminarlos; ajustar `utec-logo.png` al tamaño real de uso. |
| 19 | Parpadeo del plano en `/aula/[codigo]` por lectura de localStorage en `useEffect` | `aula/[codigo]/page.tsx:41-45` | Inicializar el estado de forma perezosa o mostrar skeleton hasta resolverlo. |

## 5. Qué NO se toca

- Diseño de `AulaSummaryCard` y `ModuleCard` (contenido, colores, semáforos, sparklines).
- Orden y contenido de "Aulas en riesgo" y "Módulos de monitoreo".
- Header (chips por aula, reloj, usuario, tema), sidebar y navegación móvil.
- Rutas, permisos y textos existentes.
- La experiencia del rol `miembro`.

## 6. Orden sugerido de implementación

1. **P0** completo (#1–#5): mayor ganancia percibida con poco riesgo.
2. **Bloque 1** y **Bloque 2** (sección 3), ya con skeletons de P0.
3. **P1** (#6–#10): reducir re-renders, diferir series, dividir bundle.
4. **P2** según capacidad del backend (#11 y #12 requieren cambios del lado del servidor).

## 7. Cómo medir

| Métrica | Herramienta | Meta orientativa |
|---|---|---|
| Tiempo hasta ver el primer dato real en `/` | Web Vitals / cronómetro en DevTools | < 1.5 s tras autenticar |
| LCP e INP | Lighthouse | LCP < 2.5 s, INP < 200 ms |
| Nº de requests en la primera carga de `/` | DevTools → Network | de ~20 a ≤ 8 antes del primer paint útil |
| JS inicial de `/` | `.next/diagnostics/route-bundle-stats.json` | de ~1.06 MB a < 0.8 MB |
| Renders del shell por minuto | React Profiler | de ~60 a solo los necesarios |
| Latencia de alerta crítica en pantalla | Prueba manual con un evento de prueba | < 5 s |

> Nota: las cifras del bundle salen de un build previo en `.next/` y pueden estar desactualizadas; conviene volver a medir antes de empezar.

## 8. Estado de implementación

`tsc`, `eslint`, `vitest` (73 tests) y `next build` pasan. **No se probó visualmente contra el backend real**: conviene revisar el dashboard con un admin y con un `miembro`.

| # | Estado | Detalle |
|---|---|---|
| Bloques 1 y 2 | Hecho | `src/components/admin/` (`panel-admin`, `bloque-alertas`, `bloque-salud`). Se muestran con el permiso `atender_incidentes` (ambos roles admin); dentro del bloque 2 cada indicador exige su propio permiso. |
| 1 | Hecho | `PantallaCarga` (skeleton del chrome) en lugar del "Cargando…"; `/acceso` y `/pantalla/*` siguen minimalistas. Falta el render optimista con cuenta en caché (se descartó por seguridad: el token vive solo en memoria). |
| 2 | Hecho | Tarjetas de aula, tarjetas de módulo, chips del header y subtítulo muestran skeleton/"comprobando…" hasta tener datos. |
| 3, 4, 5 | Hecho | `useSerie` conserva el gráfico previo (solo de la misma aula y magnitud); `/reportes` usa `keepPreviousData`; skeletons de filas en reportes, usuarios y dispositivos. |
| 6 | Hecho | Reloj en `RelojLima`; el shell ya no se re-renderiza cada segundo. |
| 7 | Parcial | `React.memo` en `AulaSummaryCard` y `ModuleCard`. No se tocaron los selectores de `useEstados`. |
| 8 | Hecho | Las series solo se piden cuando la fila entra en pantalla (`useVisible`); `staleTime` de 25 s evita refetch masivo al volver a la pestaña. |
| 9 | Hecho | Layout puro en `classroom-layout.ts`; three/r3f/drei ya no entran al chunk de la página 3D. |
| 10 | Hecho | Sparkline con `next/dynamic` y `optimizePackageImports` (recharts, radix-ui, lucide-react). |
| 11 | Parcial | Las alertas `critico` se consultan cada 5 s (antes 15 s). SSE/WebSocket requiere backend. |
| 12 | Pendiente | Endpoint agregado de series (backend). |
| 13 | No aplica | TanStack Query ya pausa el polling con la pestaña oculta (`refetchIntervalInBackground` es `false` por defecto). |
| 14 | Hecho | `.light-line` anima solo `transform`. `.glow-border`/`.glow-breathe` solo se usan en `/asistente` y `/reportar`, no en el dashboard. |
| 15 | Pendiente | Paginación de abiertas en `/alertas`. |
| 16 | Hecho | `AvisoErrores` cuenta por endpoint, no por query. |
| 17 | Pendiente | Service worker con stale-while-revalidate. |
| 18 | Hecho | Eliminados `public/{file,globe,next,vercel,window}.svg` y `public/brand/utec-campus.png` (sin referencias en `src/`, `sw.js` ni el manifest). |
| 19 | Pendiente | Parpadeo del plano importado. |

**Medición del bundle** (`route-bundle-stats.json`, JS inicial sin comprimir): `/` de ~1.06 MB a ~732 KB; `/aula/[codigo]/3d` de ~1.64 MB a ~711 KB.
