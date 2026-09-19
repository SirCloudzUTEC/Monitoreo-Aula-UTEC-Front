# Login institucional (Auth.js + Google) — estado de la migración

Migración completa del lado del código. Lo que queda es configuración manual
del proveedor OAuth (le corresponde al usuario) y correr la suite e2e contra
un servidor con esa configuración real.

## Decisiones (sin cambios; ver también `docs/DECISIONES.md` §6)

- PIN compartido eliminado por completo (memoria `no-shared-pin-auth.md`).
- Auth.js / NextAuth v5 (`next-auth@5.0.0-beta.32`), provider Google, sesión JWT sin adapter de base de datos.
- Mapeo de permisos (reemplaza el gate binario `rol === "administrador"` de antes; actualizado en la sección de abajo tras eliminar el auto-registro):

  | Acción | Gate | Quién puede |
  |---|---|---|
  | Editar umbrales, horario, Simulador, guardar plano importado | `puede(cuenta, "gestionar_dispositivos")` | `admin_operativo` y `superadmin` |
  | Enviar push de prueba | `puede(cuenta, "gestionar_dispositivos")` | `admin_operativo` y `superadmin` |
  | Suscribirse a push (recibir alertas) | `puede(cuenta, "recibir_alertas")` | cualquier cuenta `aprobada` |
  | Acusar recibo de alerta | `puede(cuenta, "atender_incidentes")` | `admin_operativo` y `superadmin` |
  | Crear cuentas y asignarles rol | `puede(cuenta, "gestionar_usuarios")` | solo `superadmin` |
  | Reportar incidente | sin cambio de acceso; se atribuye a `usuarios.id` real cuando hay sesión | cualquiera |

- Ya no está fuera de alcance: reemplaza el panel de aprobación de cuentas pendientes que se había dejado pendiente — en vez de aprobar cuentas que se autorregistran, un `superadmin` las crea directamente ya aprobadas desde `/usuarios` (ver actualización más abajo).

## Hecho y verificado

- [x] `src/auth.ts` — `NextAuth({...})` con provider Google + provider Credentials de bypass (solo si `AUTH_TEST_BYPASS_SECRET` está definida y `NODE_ENV !== "production"`). Callback `signIn` rechaza correos no institucionales y falla cerrado si `db()` es `null`. Callback `jwt` hace upsert en `usuarios` (solo toca `rol`/`estado` en la fila nueva). Callback `session` expone `session.cuenta: CuentaUsuario | null`.
- [x] `src/app/api/auth/[...nextauth]/route.ts` — expone `GET`/`POST` de `handlers`.
- [x] `src/app/api/reportes/route.ts` — atribuye el reporte a `session.cuenta` cuando hay sesión; usa el usuario demo `sistema.demo@utec.edu.pe` como fallback sin sesión.
- [x] `src/app/api/session/route.ts` y `tests/session.test.ts` — eliminados.
- [x] `src/lib/auth/session.ts` — solo conserva `sameOrigin` (PIN/HMAC eliminados).
- [x] `src/lib/store.ts` — `cuenta`/`setCuenta` reemplazan `rol`; `autorizar(permiso)` reemplaza `authorizeWrite()` (revalida contra `/api/auth/session` antes de escribir); `probarConexion()` reemplaza `refreshSession()` como heartbeat de conectividad, desacoplado de auth (pinga `/api/umbrales`, público). Acciones de escritura (`setUmbrales`, `setHorario`, `setEscenario`, `setVelocidad`, `setCorriendo`, `acusar`, `inyectarEvento`, `agregarLog`) usan `autorizar(...)` con el permiso correspondiente; `actor` en el log es el email real de la cuenta.
- [x] `src/components/session-provider.tsx` (nuevo) + `src/components/providers.tsx` — `SessionSync` vuelca `useSession().data.cuenta` al store.
- [x] `src/components/layout/app-shell.tsx` — topbar muestra nombre/email real + botón de salir (`signOut()`), o "Iniciar sesión" sin cuenta.
- [x] `src/app/acceso/boton-google.tsx` (nuevo) — `signIn("google", {callbackUrl: "/"})`; sigue mostrando "pendiente de configurar" cuando `proveedorIdentidadConfigurado()` es falso (verificado manualmente: build + start sin credenciales → `/acceso` devuelve ese estado, `/api/umbrales` POST sin sesión → 403).
- [x] `src/app/ajustes/page.tsx` — tarjeta de PIN reemplazada por tarjeta de cuenta real (nombre/email/rol/estado + cerrar sesión).
- [x] Gates actualizados: `src/app/simulador/page.tsx`, `src/app/importar/page.tsx`, `src/components/events/evento-card.tsx`, `src/app/api/umbrales/route.ts`, `src/app/api/push/send/route.ts`, `src/app/api/push/subscribe/route.ts`.
- [x] `.env.example` y `scripts/setup-local.mjs` — sin `DEMO_ADMIN_PIN`; documentan `AUTH_SECRET`, `DATABASE_URL`, `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `SUPERADMIN_EMAIL`, `AUTH_TEST_BYPASS_SECRET`.
- [x] `README.md`, `docs/DECISIONES.md`, `docs/ARQUITECTURA.md`, `docs/INTEGRACION.md`, `docs/MAPEO_REQUISITOS.md` — actualizados.
- [x] Tests reescritos/añadidos: `tests/api-validation.test.ts`, `tests/push-security.test.ts`, `tests/store-permissions.test.ts`, `tests/store-reload.test.ts`, `tests/service-worker.test.ts` (rutas de ejemplo), `tests/same-origin.test.ts` (nuevo, cubre lo que antes probaba `session.test.ts` indirectamente). `tests/e2e/stabilization.spec.ts` y `tests/e2e/offline.spec.ts` reescritos para usar el bypass de Credentials en vez del PIN.
- [x] `playwright.config.ts` — exige `AUTH_TEST_BYPASS_SECRET`/`SUPERADMIN_EMAIL` en vez de `UTEC_TEST_PIN`.
- [x] Verificación: `npx tsc --noEmit` limpio, `npx eslint .` limpio, `npm test` → 113/113 en verde, `npm run build` compila y genera todas las rutas (incluida `/api/auth/[...nextauth]`), `npm run start` + smoke manual sin credenciales de Google confirma fail-closed (`/acceso` → "pendiente de configurar", `POST /api/umbrales` sin sesión → 403).

## Pendiente (le corresponde al usuario, no automatizable desde aquí)

1. Crear proyecto en Google Cloud Console, configurar pantalla de consentimiento "Externo", registrar redirect URI `http://localhost:3000/api/auth/callback/google` (y el equivalente de producción/preview en Vercel).
2. Generar `AUTH_SECRET` (o usar el que genera `npm run setup:local`) y configurar `DATABASE_URL` apuntando a una base Neon/Postgres real (el schema ya existe en `db/schema.sql`).
3. Poner el propio correo `@utec.edu.pe` en `SUPERADMIN_EMAIL` para entrar con rol superadmin.
4. Con esas variables reales, correr `npm run build && npm run start -- --port 3101` en una terminal y `npm run test:e2e` en otra, con `AUTH_TEST_BYPASS_SECRET` y `SUPERADMIN_EMAIL` también configurados para que el helper de login e2e funcione (no se pudo ejecutar la suite e2e completa en este entorno por no tener Google OAuth ni base de datos reales disponibles).
5. Cuando se necesite, construir el panel de aprobación de cuentas pendientes (fuera de alcance de esta migración).

Plan completo original (más detalle de arquitectura, ya incorporado a `docs/DECISIONES.md`): `~/.claude/plans/quiero-que-me-des-foamy-whisper.md` (fuera del repo).

## Actualización: correo y contraseña propios de la app (además de Google)

El Workspace de UTEC bloqueó crear un cliente OAuth externo (`Error 403: org_internal`), así que Google dejó de ser viable como único método para probar el login internamente. Se agregó un segundo provider (`Credentials`, id `credenciales`) con correo y contraseña propios de la app — nunca la contraseña institucional real — sobre la misma tabla `usuarios` y el mismo modelo de roles. Detalle completo, incluidas las mitigaciones contra fuerza bruta, enumeración de cuentas, CSRF, inyección SQL y XSS: `docs/DECISIONES.md` §7.

Verificado en vivo contra la base Neon real de este proyecto: `POST /api/auth/registro` crea la cuenta (pendiente salvo `SUPERADMIN_EMAIL`), login con contraseña correcta abre sesión con el rol/estado reales, contraseña incorrecta nunca abre sesión, y el quinto intento fallido bloquea la cuenta 15 minutos incluso si el sexto intento usa la contraseña correcta. `npx tsc --noEmit`, `npx eslint .` y `npm test` (142/142) siguen en verde.

## Actualización: se elimina el auto-registro; un superusuario crea las cuentas

`POST /api/auth/registro` y `/acceso/registro` se eliminaron por completo: ya no existe una forma de que alguien se cree su propia cuenta. En su lugar hay un único superusuario por defecto, y **solo un superusuario puede crear cuentas nuevas**.

- **Superusuario por defecto**: `diego.godoy.t@utec.edu.pe`, sembrado con `npm run seed:superadmin` (`scripts/seed-superadmin.mjs`, hashea `HolaEquipo1234` con el mismo esquema scrypt de `src/lib/auth/password.ts` e hace upsert directo en `usuarios`). `SUPERADMIN_EMAIL` sigue siendo la única cuenta que se autocrea al iniciar sesión (bootstrap); es la única excepción a "toda cuenta la crea un superusuario".
- **`src/auth.ts`** — `upsertUsuario()` ya no inserta filas nuevas salvo para `SUPERADMIN_EMAIL`; para cualquier otro correo solo actualiza el nombre de una fila que ya debe existir. El callback `signIn` ahora rechaza el login (antes de llegar a `jwt`) si el correo no es el superusuario por defecto y no hay una fila en `usuarios` para ese correo — así Google tampoco puede provisionar cuentas nuevas por su cuenta.
- **`POST /api/usuarios`** (nuevo, `gestionar_usuarios`, solo `superadmin`) — recibe `{email, nombre, rol}`, genera una contraseña aleatoria (`generarPasswordTemporal()` en `src/lib/auth/password.ts`), la hashea con scrypt y crea la cuenta ya `aprobada` (`aprobado_por`/`aprobado_en` apuntan al superusuario que la creó). Responde la contraseña en texto plano **una sola vez** en el cuerpo de la respuesta, para que el superusuario se la entregue a la persona por un canal aparte; nunca se guarda ni se vuelve a mostrar. `GET /api/usuarios` lista las cuentas (sin hashes) para el mismo permiso.
- **`/usuarios`** (nuevo, `src/app/usuarios/page.tsx`) — formulario de creación (correo, nombre, rol) + tabla de cuentas existentes; oculto del todo (nav y contenido) para quien no tenga `gestionar_usuarios`. Enlazado desde la tarjeta de cuenta en `/ajustes` y desde la barra lateral (solo visible con el permiso).
- **Permisos**: `admin_operativo` ahora también tiene `gestionar_dispositivos` (antes exclusivo de `superadmin`), para poder crear/editar aulas, actualizar planos, umbrales, horario y el Simulador — el rol "administrador" pedido por el producto. `gestionar_usuarios` sigue exclusivo de `superadmin`.
- Como ya no hay auto-registro, el estado `pendiente` deja de usarse en la práctica: toda cuenta que crea un superusuario nace `aprobada`.

Verificado: `npx tsc --noEmit`, `npx eslint .` y `npm test` (144/144) en verde; `npm run build` compila y `/acceso/registro` y `/api/auth/registro` ya no existen como rutas.
