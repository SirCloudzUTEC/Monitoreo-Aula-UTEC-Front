# Migración del frontend al backend Spring Boot

Qué cambia en `Monitoreo-Aula-UTEC-Front` (Next.js) para dejar de simular datos y consumir el backend real descrito en `docs/BACKEND_SPRINGBOOT.md`. Ese documento reemplaza **todas** las rutas API actuales de Next.js y se vuelve la única fuente de verdad de usuarios/sesión; este documento cubre el lado del cliente de ese corte.

## 1. Contexto

Hoy el frontend simula todo del lado del navegador (motor de reglas, generador de mediciones, escenarios) y solo persiste de verdad `usuarios`/`incidentes`/`notificaciones` en Neon vía Next.js. Con el backend Spring Boot en línea, Next.js deja de tocar la base de datos directamente y de manejar sesión: se vuelve un cliente puro de la API REST del backend. `/api/asistente` es la única ruta que se queda igual (fuera de alcance de esta migración).

## 2. Qué se elimina

**El simulador completo** (ya no tiene sentido una vez hay datos reales — dejaría dos fuentes de verdad compitiendo por lo mismo):
- `src/lib/simulator/generator.ts`, `src/lib/simulator/profiles.ts`, `src/lib/simulator/rng.ts`
- `src/lib/rules/engine.ts` (la copia cliente — la lógica se porta al backend, ver `BACKEND_SPRINGBOOT.md` §7)
- `src/lib/data/data-source.ts` (`SimulatedDataSource` y el stub `MqttDataSource`)
- Los conceptos `Escenario`/`Velocidad`/`EstadoSimulacion` en `src/lib/types.ts`
- `src/app/simulador/page.tsx` y su entrada de navegación en `src/components/layout/app-shell.tsx`

**Todo el login construido en Next.js** (Spring Boot pasa a ser la única fuente de verdad de usuarios/JWT):
- `src/auth.ts` y Auth.js/NextAuth completo (provider Google, provider Credentials, provider de bypass de test, estrategia de sesión JWT propia de NextAuth)
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/usuarios/route.ts`, `src/app/usuarios/page.tsx`, `src/lib/auth/credentials.ts`, `src/lib/auth/password.ts` (el módulo de correo/contraseña y creación de cuentas por un superusuario — su lógica se porta al backend, ver `BACKEND_SPRINGBOOT.md` §6/§9)
- `src/components/session-provider.tsx` (el `SessionProvider` de `next-auth/react`)

**Las rutas API que Spring Boot absorbe** (ver la tabla de equivalencias en `BACKEND_SPRINGBOOT.md` §1):
- `src/app/api/estado`, `/eventos`, `/mediciones`, `/serie`, `/umbrales`, `/reportes`, `/push/subscribe`, `/push/send` — se borran, el navegador llama directo al backend.

**Acceso directo a la base de datos**:
- `src/lib/data/db.ts` y la dependencia `@neondatabase/serverless` — Next.js no vuelve a tocar Postgres.

**Persistencia local que se vuelve redundante** (`src/lib/data/storage.ts`):
- localStorage: `umbrales`, `horario`, `session:v2`, `escenarios`, `contactos` — todo esto pasa a vivir en el backend.
- IndexedDB: el object store `log` (el log de eventos) — pasa a ser el log real en `eventos`.
- **Se mantienen** `sonido` (preferencia de UI pura, no tiene sentido en el backend) y `plano:{codigo}` (importación de plano, una conveniencia por navegador, tangencial — puede quedarse client-side sin necesidad de un endpoint).

## 3. Qué se agrega o reemplaza

- **Capa de cliente API** (`src/lib/api/client.ts`, nuevo) — wrapper sobre `fetch` que lee `NEXT_PUBLIC_API_BASE_URL`, adjunta `Authorization: Bearer` desde un holder de token en memoria (no persistido), y ante un 401 intenta exactamente un `POST /api/auth/refresh` silencioso (con `credentials: 'include'` para que viaje la cookie httpOnly) antes de reintentar la request original. Traduce los `ProblemDetail` del backend a errores tipados que el resto de la app puede mostrar.
- **Flujo de auth nuevo** — el formulario de login (`src/app/acceso/*`) y el panel de creación de cuentas (`src/app/usuarios/*`, solo `superadmin`) pasan a hacer `POST` directo contra el backend (vía el cliente de arriba) en vez de `next-auth/react`'s `signIn()`. El access token se guarda **solo en memoria** (un slice chico de Zustand o un `React.Context`, nunca `localStorage` ni `sessionStorage` — así un XSS no puede robarlo leyendo storage), el refresh token vive exclusivamente en la cookie httpOnly que setea el backend (el frontend nunca la lee ni la toca directamente). `logout` llama a `POST /api/auth/logout` y limpia el token en memoria.
- **Zustand (`src/lib/store.ts`) se reduce de tamaño y de responsabilidad**: deja de conducir el loop de simulación (`iniciar()`, `tickReal`, `procesarBucket`, el motor y el `dataSource` a nivel de módulo desaparecen por completo). Lo que queda: `cuenta`/`setCuenta` (ahora poblado por el cliente de auth nuevo, no por `next-auth/react`'s `useSession()`), y las preferencias puramente de UI (`sonido`, `prefsAulas`).
- **`@tanstack/react-query`** (dependencia nueva) para los datos que antes venían de la simulación: reemplaza el loop de tick hecho a mano por polling con caché/revalidación, que es exactamente su trabajo — hacerlo a mano en Zustand (como el loop actual) es estrictamente más código de mantener para este alcance. Intervalos sugeridos: 5s para el estado/lecturas actuales del dashboard (misma cadencia que los sensores), 15-30s para el log de eventos/alertas (menos sensible a latencia).
- **Componentes que se tocan** (pasan de leer `useApp`'s estado simulado a usar hooks de react-query contra la nueva API):
  - Dashboard (`src/app/page.tsx`, `src/components/modules/*`) → `GET /api/aulas/{codigo}/estado`
  - Detalle de módulo (`src/app/modulo/[id]/page.tsx`) → `GET /api/aulas/{codigo}/serie`
  - Log de eventos (`src/app/log/page.tsx`) → `GET /api/eventos` (paginado)
  - `src/app/ajustes/page.tsx` — los formularios de umbrales/horario ahora sí persisten de verdad (`PUT /api/umbrales`, `PUT /api/horario`) en vez de validar-y-descartar como hoy
  - `src/app/alertas/page.tsx`, `src/components/events/evento-card.tsx` — el acuse llama a `POST /api/eventos/{id}/acuse` de verdad
  - `src/app/reportar/page.tsx` → `POST /api/incidentes`
  - `src/app/pantalla/[aula]/page.tsx` → `GET /api/aulas/{codigo}/estado` (mismo endpoint que el dashboard, vista de monitor)

## 4. Variables de entorno

**Se eliminan** (ya no aplican, la lógica que las usaba se fue del frontend): `AUTH_SECRET`, `DATABASE_URL`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `MICROSOFT_OAUTH_CLIENT_ID`, `SUPERADMIN_EMAIL`, `AUTH_TEST_BYPASS_SECRET`, `VAPID_PRIVATE_KEY` (el envío de push pasa al backend), `NEXT_PUBLIC_MQTT_WS_URL`, `MQTT_USER`, `MQTT_PASS` (el concepto de fase 2 original era el navegador conectándose directo a MQTT vía WebSocket; con el backend haciendo la ingesta MQTT, el navegador nunca habla MQTT — deja de tener sentido incluso como variable sin usar).

**Se mantienen**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (sigue haciendo falta en el navegador para `pushManager.subscribe()`).

**Se agregan**: `NEXT_PUBLIC_API_BASE_URL` (URL del backend Spring Boot).

## 5. Orden de migración

**Un solo corte coordinado, no incremental por feature.** Esto es un equipo chico/solo estudiante, no una organización que necesite despliegue gradual, y una app a medio migrar (algunas pantallas reales, otras simuladas) duplica lo que hay que mantener mentalmente consistente — dos fuentes de verdad compitiendo por `EstadoAula` es peor que cualquiera de las dos por separado.

1. Construir el backend Spring Boot de forma independiente contra los datos ya vivos en Neon (migración Flyway baseline, auth + `usuarios` funcionando) — verificarlo completamente por su cuenta (tests propios, `curl`), sin tocar el frontend todavía; el frontend sigue funcionando sobre Auth.js en paralelo durante esta fase.
2. Agregar aulas/horario/umbrales/eventos/mediciones + sus endpoints, con tests de integración, sembrados con datos de prueba antes de que exista hardware real.
3. Agregar ingesta MQTT + el motor de reglas portado, probado contra un Mosquitto local por Docker Compose, usando un script publicador sintético como reemplazo de las Raspberry Pi reales durante desarrollo (este script vive solo del lado del backend, nunca se despliega a producción — es el sucesor del simulador del frontend, pero ya no es parte de la app).
4. Agregar push + incidentes, con la matriz de permisos completa en verde.
5. Recién ahí tocar el frontend: retirar Auth.js/simulador y cablear el cliente API nuevo + react-query + el flujo de auth nuevo, todo en una sola rama, fusionada como un solo release una vez que toda la app compile y las suites de Vitest/Playwright existentes pasen contra el backend real.
6. Cortar las variables de entorno de Vercel, desplegar ambos lados, correr la suite e2e completa contra el stack real, quitar `@neondatabase/serverless` y `next-auth` de `package.json`.

## 6. Preocupaciones transversales

- **Coordinación de orígenes CORS**: el allowlist de Spring debe coincidir exactamente con los orígenes de Next.js (puerto de desarrollo local + dominio de Vercel de producción) — un desajuste acá es el bug número uno de este tipo de despliegue partido ("el login falla en silencio").
- **Consistencia de zona horaria**: el backend debe reproducir exactamente la convención `isoLima()` del frontend — serializar todos los timestamps salientes con offset fijo `-05:00` (`ZoneOffset.of("-05:00")` en Java, no `ZoneId.of("America/Lima")`, aunque sean equivalentes hoy dado que Perú no tiene horario de verano — el offset fijo garantiza formato idéntico byte a byte con lo que el frontend ya espera, igual que el comentario "sin DST" que ya existe en el código actual). Todo se guarda en Postgres como `timestamptz` (UTC interno, como ya hace el esquema) y solo se formatea al offset de Lima en el borde de serialización JSON.
- **Evitar que los enums se desincronicen**: en vez de generación de código, un endpoint liviano de contrato — `GET /api/meta/enums` en Spring, devolviendo las listas de valores vigentes de `Magnitud`/`TipoEvento`/`Severidad`/`Rol`/`Permiso`/`Ambito` — verificado en CI por un test de Vitest que compara contra los unions hardcodeados en `types.ts`/`identity.ts`. Encaja en el mismo estilo de contract-testing liviano que ya existe en el repo (`tests/api-validation.test.ts`, `scripts/contract-smoke.mjs`), y falla ruidosamente en el momento en que cualquiera de los dos lados se desalinea.

## 7. Verificación de este corte

- `npx tsc --noEmit`, `npx eslint .` y `npm test` en verde tras retirar el simulador y Auth.js (sin referencias colgantes a los módulos eliminados).
- `npm run build` genera correctamente todas las rutas restantes (sin las que se borraron).
- Login/creación de cuentas/logout, umbrales/horario, log de eventos, acuse de alertas y reporte de incidentes probados a mano contra el backend real antes de dar el corte por cerrado, más `npm run test:e2e` contra el stack real.
- Confirmar que `git grep -n "@neondatabase/serverless\|next-auth"` no devuelve nada en `src/` tras el corte, y que `package.json` ya no las lista como dependencias.

## 8. Estado de la implementación (corte aplicado)

El corte de §5 paso 5 está hecho en el frontend: Auth.js, el simulador, el motor de reglas cliente, las rutas `/api/*` de Next (salvo `/api/asistente`), `@neondatabase/serverless`, `next-auth`, `web-push` y `db/` + scripts de Neon salieron; entraron `src/lib/api/{client,endpoints,hooks,session}.ts`, TanStack Query y el flujo de sesión con access token en memoria + cookie httpOnly.

Contra el plan original se decidió distinto en estos puntos:

- **`src/lib/simulator/rng.ts` se conserva**: ya no es parte del simulador, pero `lib/anomaly/detector.ts` (Isolation Forest de la vista `/modulo/[id]`) usa `mulberry32` para ser determinista.
- **`src/data/aulas.json` sigue estático** (`src/lib/aulas.ts`): el plano 2D/3D y `notFound()` lo necesitan de forma síncrona; `GET /api/aulas` queda disponible pero no se consume todavía.
- **`contactos` (localStorage) se mantiene**: el backend no tiene endpoint para ellos, así que no pueden "pasar a vivir en el backend" todavía.
- **Alertas abiertas = dos consultas** (`severidad=critico` y `=alerta` con `abierto=true`) en vez de `abierto=true` a secas, porque el backend persiste los eventos `info` (ingreso, egreso, inicio_clase…) con `cerrado=false` y nunca los cierra (`ReglaEngineService.info()`); pedirlos todos traería miles de filas informativas. Conviene cerrarlos en el backend y así simplificar esta consulta.
- **Pantalla del aula (`/pantalla/[aula]`)**: los botones verdes de "corregir" eran una acción del simulador; ahora la tarjeta en alerta muestra la acción recomendada como texto. El monitor debe tener una sesión iniciada (el backend exige JWT).
- **Log (`/log`)**: aula y severidad se filtran en el servidor y se pagina de a 50; el cuadro de texto filtra solo la página cargada, y la "huella por actor" trabaja sobre los 200 eventos más recientes del rango (tope de página del backend; acotable por fechas). El CSV recorre todas las páginas del filtro (tope 10 000 filas).
- **Prueba de push**: `POST /api/push/enviar` sin `usuarioId` difunde a todos, así que "Enviar prueba" apunta al propio usuario (solo el superadmin puede resolver su id vía `GET /api/usuarios`); el resto recibe una notificación local.
- **Reportes**: `IncidenteDto` trae `reportadoPor` (id numérico), no el correo; la tabla muestra `usuario #id`.
- **Contrato de enums**: `tests/contract-enums.test.ts` corre solo con `UTEC_API_BASE_URL` definido (necesita el backend arriba).
- **E2E**: reescritos contra el stack real con `E2E_EMAIL`/`E2E_PASSWORD` (ya no existe el bypass de Auth.js).

- **Revisión posterior**: los hallazgos abiertos del backend y del frontend (con severidad y arreglo propuesto) están en `CORRECCIONES.md`.
