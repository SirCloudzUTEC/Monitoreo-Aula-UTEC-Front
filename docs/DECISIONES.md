> **Histórico — anterior al corte al backend.** Este documento describe la fase con simulador en el navegador y Auth.js/Neon en Next.js, que ya no existen en el frontend. La arquitectura vigente está en `MIGRACION_FRONTEND_BACKEND.md` (§8 lista el estado real) y `BACKEND_SPRINGBOOT.md`.

# Decisiones de diseño

Registro de decisiones tomadas con autonomía donde el requisito era ambiguo.

## 1. Simulador 100 % determinista (funciones puras del tiempo)

Cada magnitud es una función pura de `(aula, escenario, inicioEscenario, horario, timestamp)` con ruido
sembrado (FNV-1a + mulberry32 + Box-Muller). Ventajas:

- Las API routes son _stateless_: Vercel serverless no comparte memoria entre invocaciones,
  y así cualquier instancia responde igual.
- Las gráficas muestrean cualquier rango (1 h / 24 h / 7 d) a cualquier resolución sin
  reproducir la historia tick a tick.
- Entradas idénticas producen mediciones idénticas. La API usa valores semilla; no comparte el historial ni la configuración local del navegador. Los IDs de eventos incluyen un UUID de sesión y no son deterministas entre motores independientes.

## 2. Hora siempre en Lima (UTC-5 explícito)

Vercel corre en UTC y el navegador en hora local. Todo cálculo de horario usa
`horaLima`/`diaLima` (`src/lib/schedule.ts`): se desplaza el instante −5 h y se leen campos
UTC. Nunca se usa `getHours()`/`getDay()` del huso del host.

## 3. PWA con enfoque nativo de Next (sin @serwist/next)

Se mantienen `src/app/manifest.ts` y `public/sw.js` para lectura offline y push, sin agregar un plugin de build. El worker solo se registra en producción. Documentos, recursos estáticos, API y RSC tienen políticas separadas; las respuestas API offline son JSON 503, nunca HTML. La cobertura se verifica con pruebas de navegador, no por el solo hecho de que exista un manifest.

## 4. Anomalías en TypeScript puro (sin TensorFlow.js)

F9 pide z-score + regla de salto + isolation forest. TF.js agregaría ~1 MB de bundle sin
beneficio a este volumen de datos; el isolation forest propio (50 árboles, submuestra 64,
semilla fija) es suficiente y determinista.

## 5. Web Push sin base de datos (fase 1)

La suscripción push vive en el navegador (service worker). `/api/push/send` recibe la
suscripción en el body y envía. Fase 2: persistir suscripciones del equipo de operaciones
y hacer _fan-out_ en eventos críticos desde el servidor.

## 6. Login institucional con Auth.js, sin PIN compartido

Se descartó definitivamente el PIN incorporado en el bundle, el encabezado `x-rol` y el PIN compartido en `DEMO_ADMIN_PIN`/`AUTH_SESSION_SECRET`: un secreto único conocido por todos los administradores es fácil de adivinar, filtrar o pasar de forma informal. En su lugar, `src/auth.ts` usa Auth.js (NextAuth v5) con provider Google, sesión JWT sin adapter de base de datos: los callbacks propios leen/escriben la tabla `usuarios`, reutilizando `esCorreoInstitucional`/`rolInicial`/`estadoInicial`/`puede` de `src/lib/auth/identity.ts`. Solo cuentas `@utec.edu.pe` verificadas pueden iniciar sesión; sin `DATABASE_URL` configurada, el login falla cerrado. El origen se sigue comparando con el Host real en `sameOrigin()` porque NextURL normaliza las direcciones loopback; no se confía en forwarded-host.

Las mutaciones locales (`useApp().autorizar(permiso)`) revalidan la cuenta contra `/api/auth/session` antes de escribir, y cada API protegida vuelve a comprobar `puede(cuenta, permiso)` con `await auth()` del lado del servidor: el cliente nunca es la fuente de verdad de sus propios permisos.

No hay auto-registro ni panel de aprobación de cuentas pendientes: el schema soporta `estado`/`aprobado_por`/`auditoria` desde el inicio, y ahora se usan para que un `superadmin` cree cuentas ya `aprobada` directamente desde `/usuarios` (`POST /api/usuarios`), en vez de aprobar cuentas que se autorregistraron. `SUPERADMIN_EMAIL` sigue siendo la única cuenta que se autocrea (bootstrap) al iniciar sesión por primera vez; toda otra cuenta debe existir de antemano — `src/auth.ts` rechaza el login si no.

## 7. Correo y contraseña propios de la app, junto a Google

El Workspace de UTEC bloquea crear clientes OAuth externos (`Error 403: org_internal`) para cuentas gestionadas por su organización, lo que hacía inviable depender solo de Google para las pruebas internas. Se agregó un provider `Credentials` (`src/auth.ts`, id `credenciales`) con correo y contraseña **propios de la app**: nunca es la contraseña institucional real de UTEC, solo un secreto que un `superadmin` genera al crear la cuenta (`POST /api/usuarios`) y que solo desbloquea esta app. Ambos providers comparten la misma tabla `usuarios`, el mismo dominio (`esCorreoInstitucional`) y el mismo modelo de roles/estado — da igual con cuál se entró.

Medidas contra los riesgos propios de un login con contraseña:

- **Hash**: `scrypt` (módulo `node:crypto`, sin dependencia externa) con sal aleatoria por cuenta — `src/lib/auth/password.ts`.
- **Fuerza mínima**: 10+ caracteres, rechaza la contraseña igual al correo y una lista corta de contraseñas obviamente débiles (`fortalezaPassword`).
- **Fuerza bruta**: bloqueo de la cuenta 15 minutos tras 5 intentos fallidos (`intentos_fallidos`/`bloqueado_hasta` en `usuarios`), reseteado solo en un login correcto.
- **Enumeración de cuentas**: correo inexistente, cuenta sin contraseña (solo-Google) y contraseña incorrecta hacen una verificación señuelo de duración equivalente (`verificarConSenuelo`) antes de responder, para que el tiempo de respuesta no delate cuál de los tres casos ocurrió. `POST /api/usuarios` responde el mismo 409 genérico si el correo ya existe.
- **CSRF**: el login usa el flujo estándar de Auth.js (token de doble envío); `POST /api/usuarios` exige `sameOrigin()` y `gestionar_usuarios`, igual que el resto de las API de escritura.
- **Inyección SQL**: toda consulta usa el *tagged template* `sql` de `@neondatabase/serverless`, nunca concatenación de texto.
- **XSS**: no hay `dangerouslySetInnerHTML` en el proyecto; nombre y correo se muestran siempre como texto JSX, escapado por React.

Verificado en vivo contra Neon: `POST /api/usuarios` crea la cuenta ya `aprobada` con una contraseña generada por el servidor, login con la contraseña correcta abre sesión con el rol/estado reales, la contraseña incorrecta nunca abre sesión, y al quinto intento fallido la cuenta queda bloqueada incluso probando la contraseña correcta.

## 7. Eventos inyectados se cierran con el acuse

Un evento inyectado desde el simulador (`fuente: inyeccionManual`) no tiene condición
física que lo libere, así que el acuse de recibo lo cierra. Los eventos de reglas se
cierran cuando la condición cae bajo el umbral con histéresis.

## 8. Escalamiento calculado en la vista

"Crítico sin acuse por 10 min" se calcula al renderizar (`estaEscalado`) en lugar de
mutar el estado del motor: menos estados que sincronizar y el umbral de 10 min queda en
un solo lugar.

## 9. Estado del aula en `/api/estado` sin alertas

La máquina de estados con alertas vive en el cliente (motor + acuses en el navegador).
El endpoint devuelve el estado derivable del horario (Cerrada/Libre/EnClase) y lo
documenta; en fase 2 el procesador de aula será la fuente de verdad.

## 10. Plano importado reemplaza el contorno del aula

El archivo importado en F5 (CSV/DXF/JSON) se guarda por aula en localStorage
(`plano:{codigo}`) y `/aula/[codigo]` lo dibuja en lugar del rectángulo de la
especificación. Heurística de unidades: contornos > 50 m se asumen en cm, > 1000 m en mm.

## 11. Restauración del motor y su historial

Se guarda un checkpoint reciente con reloj, escenarios, cronología de cambios, estado del motor y últimos 500 registros; IndexedDB conserva el historial restante. Las referencias a eventos abiertos se reconstituyen al restaurar el motor. No se repite el calentamiento de 30 minutos al recargar una sesión válida.

El checkpoint no incluye permisos. Las cuotas de almacenamiento, borrados del usuario, cierres durante una transacción y conflictos entre pestañas no tienen garantía de recuperación; exportar CSV sigue siendo necesario para evidencias importantes. La retención de 90 días es un filtro en la vista, no un borrado físico periódico de IndexedDB.

## 12. Modo offline de lectura

`navigator.onLine` no demuestra que el servidor esté disponible. La respuesta de `/api/session` complementa esa señal; mientras no se confirme conectividad, el reloj permanece congelado y no se permiten mutaciones. Se conservan las lecturas guardadas, no se simulan nuevas lecturas durante una desconexión detectada. La emulación de navegador verifica caché, recarga, reloj congelado y reconexión; no sustituye las pruebas físicas en todos los dispositivos.

## 13. Sin auto-registro: un superusuario provisiona las cuentas

Se eliminó `/acceso/registro` y `POST /api/auth/registro`: nadie puede crearse su propia cuenta. En su lugar hay un único superusuario por defecto (`SUPERADMIN_EMAIL`, sembrado con `npm run seed:superadmin`) que es la única cuenta que se autocrea al iniciar sesión por primera vez (bootstrap). `src/auth.ts` rechaza el login de cualquier otro correo institucional que no tenga ya una fila en `usuarios` — ni Google ni el provider de credenciales pueden provisionar cuentas nuevas por su cuenta.

Ese superusuario crea el resto de cuentas desde `/usuarios` (`POST /api/usuarios`, permiso `gestionar_usuarios`): elige el correo, el nombre y el rol, y el servidor genera una contraseña aleatoria que se muestra una sola vez en la respuesta para que se le entregue a esa persona por un canal aparte. La cuenta nace ya `aprobada` — no hay estado `pendiente` que aprobar después, porque ya pasó por un superusuario al crearse.

Se aprovechó el cambio para separar mejor los tres roles: `miembro` (usuario normal, solo visualización + reportar/recibir alertas), `admin_operativo` (administrador: además atiende incidentes y gestiona aulas — crear aulas, actualizar planos, umbrales, horario, Simulador — permiso que antes era exclusivo de `superadmin`) y `superadmin` (superusuario: todo lo anterior más crear cuentas e integraciones). Antes, cualquier correo `@utec.edu.pe` que iniciara sesión con Google terminaba con una fila `miembro`/`pendiente` en la base sin que nadie lo hubiera decidido; ahora cada cuenta existe porque un superusuario la creó a propósito, con el rol que decidió.
