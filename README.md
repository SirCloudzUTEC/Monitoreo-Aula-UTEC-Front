# Aula Digital UTEC

Gemelo digital de las aulas **L-419** y **A-1001** para PI3 – UTEC: confort, iluminación, calidad de aire, ruido, aforo, accesos, ventanas y salud de nodos.

Este repositorio es el **frontend**: un cliente puro de la API REST del backend Spring Boot (`../backend`). Los datos vienen de las Raspberry Pi por MQTT → backend → motor de reglas → API; el navegador nunca habla con MQTT ni con la base de datos, y ya no simula nada. El plano SVG es esquemático; Blender y los planos oficiales quedan para otra fase.

Stack: Next.js **16.3.4** (App Router), React, TypeScript, Tailwind, shadcn/ui, Recharts, Zustand, TanStack Query y Vitest. Interfaz española.

## Desarrollo local

Requisitos: Node.js 22 LTS o posterior compatible, npm y el backend en marcha (`../backend`, por defecto en `http://localhost:8080`). Se conserva un único `package-lock.json`.

```bash
npm ci
npm run setup:local      # crea .env.local (sin sobrescribirlo)
npm run dev
```

Abre `http://localhost:3000`. Toda pantalla salvo `/acceso` exige sesión: el backend rechaza lecturas sin token, así que el frontend redirige al login.

Para que el login funcione entre ambos procesos:

- En el backend, `CORS_ALLOWED_ORIGINS` debe incluir **exactamente** el origen del frontend (`http://localhost:3000`). Un desajuste hace que el login falle en silencio.
- En desarrollo local (http, mismo sitio) el backend usa `COOKIE_SECURE=false` y `COOKIE_SAMESITE=Lax`. Con el frontend en Vercel y el backend en otro dominio, la cookie necesita `Secure` + `SameSite=None` (ver `docs/BACKEND_SPRINGBOOT.md` §9).
- `NEXT_PUBLIC_API_BASE_URL` (en `.env.local`) apunta al backend. Cambiar variables requiere reiniciar `npm run dev`.

No hay auto-registro: el backend siembra la cuenta superusuario (`SUPERADMIN_EMAIL`) en su primer arranque; desde esa cuenta, en `/usuarios`, se crea el resto de cuentas y se asigna rol.

### Login institucional y permisos

El acceso es por cuenta real, restringida a `@utec.edu.pe`; no hay PIN compartido ni registro abierto. Toda cuenta la crea un superusuario desde `/usuarios` (correo, nombre y rol; el backend genera la contraseña y la muestra una sola vez para entregarla a esa persona). La contraseña es propia de la app (Argon2id en el backend), no la contraseña institucional. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.

Cómo viaja la sesión:

- El **access token** (JWT, 15 min) vive solo en memoria de la pestaña: nunca en `localStorage` ni `sessionStorage`. Cada request lo envía como `Authorization: Bearer`.
- El **refresh token** es una cookie `httpOnly` que setea el backend; JavaScript nunca la lee. Al cargar la página, o ante un 401, el cliente (`src/lib/api/client.ts`) hace exactamente un `POST /api/auth/refresh` silencioso y reintenta.
- Suspender a una cuenta o cambiarle el rol invalida sus tokens de inmediato (`token_version`); el siguiente request devuelve 401 y el usuario vuelve a `/acceso`.

Roles, de menor a mayor alcance (el frontend solo los usa para ocultar controles; el backend autoriza cada request):

- **miembro** — solo visualización, reportar incidentes y recibir alertas.
- **admin_operativo** — además, atender incidentes y editar umbrales y horario.
- **superadmin** — todo lo anterior, más crear cuentas, cambiar roles, suspender y restablecer contraseñas desde `/usuarios`.
- Una cuenta `pendiente` o `suspendida` no tiene permisos: ve un aviso y ningún dato.

## Pruebas

```bash
npm test               # Vitest (unitarias, sin backend)
npm run typecheck
npm run lint
```

Contrato de enums con el backend (opcional, requiere el backend en marcha): compara los valores fijos de `types.ts`/`identity.ts`/catálogo con `GET /api/meta/enums`.

```bash
UTEC_API_BASE_URL=http://localhost:8080 npm test
```

Las pruebas E2E corren contra el **stack real** (backend + este frontend), con el build de producción (el service worker no se registra con `npm run dev`):

```bash
# Terminal 1
npm run build
npm run start -- --hostname 127.0.0.1 --port 3101

# Terminal 2, desde el mismo proyecto
E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
```

`E2E_EMAIL`/`E2E_PASSWORD` deben ser una cuenta aprobada del backend (un superusuario cubre todas las pantallas), y `CORS_ALLOWED_ORIGINS` del backend debe incluir `http://127.0.0.1:3101`. Usa el **mismo host** en ambos lados: con `SameSite=Lax` la cookie de refresh solo viaja entre orígenes del mismo sitio, así que frontend en `127.0.0.1:3101` exige `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080` (y no `localhost`), o la sesión no sobrevivirá a una recarga. Playwright usa Chrome instalado en local; en CI, Chromium (`npx playwright install --with-deps chromium`). `UTEC_BASE_URL` permite elegir otra instancia **de pruebas**, sin apuntar a producción. `scripts/contract-smoke.mjs` verifica el formato SYS-09.2 de las mediciones contra el backend.

Las trazas y capturas de fallos pueden contener datos de la sesión de prueba: permanecen ignoradas en `test-results/` y no deben publicarse sin revisar.

## Pantallas

| Ruta               | Uso                                                   |
| ------------------ | ----------------------------------------------------- |
| `/acceso`          | Inicio de sesión                                      |
| `/`                | Resumen de las aulas y módulos                        |
| `/modulo/[id]`     | Gráficas, umbrales y anomalías                        |
| `/alertas`         | Alertas, acuses e historial                           |
| `/aula/[codigo]`   | Plano 2D, nodos y componentes                         |
| `/pantalla/[aula]` | Vista de monitor con valores grandes (requiere sesión iniciada en ese monitor) |
| `/log`             | Log paginado desde el servidor y CSV de diez columnas |
| `/importar`        | Contorno CSV, DXF o JSON con vista previa             |
| `/reportar`        | Reportar un incidente (categoría, ubicación, descripción) |
| `/reportes`        | Ver reportes: propios, o todos con `atender_incidentes` (atender/resolver) |
| `/usuarios`        | Crear cuentas, cambiar rol, suspender (solo superusuario) |
| `/ajustes`         | Sesión, umbrales, horario, contactos y notificaciones |

Se conservan redirecciones desde `/dashboard`, `/configuracion`, `/footprint`, `/aulas/:aulaId` y `/login`.

## Datos, persistencia y offline

Las lecturas y el estado de cada aula se consultan cada 5 s (`GET /api/aulas/{codigo}/estado`); las alertas abiertas y el log, cada 15–30 s, con TanStack Query. El log, los umbrales, el horario, los acuses y los reportes viven en el backend (fuente única de verdad): dos navegadores ven lo mismo.

- Solo quedan en el navegador (localStorage) conveniencias por equipo: preferencia de sonido, aulas elegidas del panel, plano importado en `/importar` y contactos de notificación (aún sin endpoint en el backend).
- La PWA guarda documentos y recursos visitados; evita mezclar HTML y respuestas de la API. **Abre las pantallas con conexión antes de depender de ellas offline.**
- Un sondeo de `GET /actuator/health` del backend detecta desconexión: la app pasa a solo lectura y se recupera sola al volver la conexión. No hay escrituras offline. La comprobación periódica puede tardar hasta 30 segundos más el timeout de cinco segundos si el navegador no emite un evento offline.
- Las alertas críticas llegan por notificación push desde el backend aunque la app esté cerrada; dentro de la app además salen como toast (y sonido, si está activado).

## Preparar un despliegue en Vercel

El repositorio de trabajo es `SirCloudzUTEC/Monitoreo-Aula-UTEC-Front`. Las correcciones se revisan en una rama y PR; **no ejecutar comandos que reemplacen `main` ni publicar producción sin validar un preview**.

En el proyecto Vercel, selecciona Next.js y configura para el entorno correspondiente (Preview o Production):

| Variable                       | Requisito                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`     | URL HTTPS pública del backend Spring Boot, sin barra final                             |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID, solo si se habilita push; debe ser la misma que `VAPID_PUBLIC_KEY` del backend |

Ya no se configuran aquí `AUTH_SECRET`, `DATABASE_URL`, `GOOGLE_OAUTH_*`, `SUPERADMIN_EMAIL`, `VAPID_PRIVATE_KEY` ni variables MQTT: pertenecen al backend. En el backend, `CORS_ALLOWED_ORIGINS` debe listar el dominio de Vercel de este despliegue (y `COOKIE_SECURE=true`, `COOKIE_SAMESITE=None` si están en dominios distintos).

### Web Push opcional

Genera claves con `npx web-push generate-vapid-keys`; la privada va solo en el backend (`VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`) y la pública también en `NEXT_PUBLIC_VAPID_PUBLIC_KEY` de este frontend. Prueba con HTTPS (o localhost) y una cuenta aprobada. En Ajustes, concede permiso y envía una prueba.

Las suscripciones se guardan en el backend por cuenta y por navegador, y las alertas críticas se envían desde allí. Los errores push no desactivan las alertas in-app. Correo y Telegram son adaptadores pendientes; el escalamiento visual indica contactar al responsable, no que se haya enviado un mensaje.

## Documentación

- [Migración frontend → backend](docs/MIGRACION_FRONTEND_BACKEND.md)
- [Backend Spring Boot](docs/BACKEND_SPRINGBOOT.md)
- [Decisiones](docs/DECISIONES.md)
- [Arquitectura](docs/ARQUITECTURA.md)
- [Mapeo de requisitos](docs/MAPEO_REQUISITOS.md)
- [Integración y verificación](docs/INTEGRACION.md)

La app no captura imágenes ni audio. Los eventos del log quedan atribuidos al correo institucional real de quien los generó.
