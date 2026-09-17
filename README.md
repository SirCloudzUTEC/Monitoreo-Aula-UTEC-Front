# Aula Digital UTEC

Demostración del gemelo digital de las aulas **L-419** y **A-1001** para PI3 – UTEC: confort, iluminación, calidad de aire, ruido, aforo, accesos, ventanas y salud de nodos.

**Los datos son simulados. No hay sensores, broker MQTT ni integración física conectados.** El plano SVG es esquemático; Blender y los planos oficiales quedan para otra fase.

Stack: Next.js **16.3.4** (App Router), React, TypeScript, Tailwind, shadcn/ui, Recharts, Zustand y Vitest. Interfaz española. API compatible con Vercel serverless, sin base de datos externa en esta fase.

## Desarrollo local

Requisitos: Node.js 22 LTS o posterior compatible y npm. Se conserva un único `package-lock.json`.

```bash
npm ci
npm run setup:local
npm run dev
```

Abre `http://localhost:3000`. `setup:local` crea `.env.local` únicamente si no existe, con un `AUTH_SECRET` aleatorio. Consulta la salida del comando y completa el resto ahí mismo. Nunca subas `.env.local` a Git.

Si el archivo ya existía, completa `AUTH_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `SUPERADMIN_EMAIL` y `DATABASE_URL` según `.env.example`; el script no lo sobrescribe. Cambiar variables requiere reiniciar el servidor.

Pon tu propio correo `@utec.edu.pe` en `SUPERADMIN_EMAIL` para entrar con rol superadmin, cualquiera sea el método de login que uses.

Google es opcional: si tu Workspace institucional bloquea crear clientes OAuth externos (`Error 403: org_internal`, común en organizaciones administradas), no hace falta — usa **Crear cuenta** en `/acceso` con tu correo `@utec.edu.pe` y una contraseña nueva (nunca tu contraseña institucional real, es un secreto propio de esta app). Si igual quieres configurar Google más adelante: crea un proyecto en [Google Cloud Console](https://console.cloud.google.com), pantalla de consentimiento "Externo" en modo Prueba (sin dominio ni logo, solo agrega tu correo en "Test users"), y registra la redirect URI `http://localhost:3000/api/auth/callback/google`.

### Login institucional y permisos

El acceso es por cuenta real, restringida a `@utec.edu.pe`; no hay PIN compartido. Dos formas de entrar, intercambiables sobre la misma cuenta:

- **Correo y contraseña** (`/acceso/registro` para crear la cuenta): la contraseña es propia de la app (hash scrypt con sal, nunca en texto plano), no la contraseña institucional. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.
- **Google** (opcional, solo si `GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET` están configurados). Sin esas variables, `/acceso` simplemente no muestra el botón de Google en vez de uno roto.

- **miembro** (rol por defecto al primer login): lectura, reportar incidente, recibir alertas.
- **admin_operativo**: además, atender incidentes (acusar recibo).
- **superadmin** (solo la cuenta en `SUPERADMIN_EMAIL`, auto-aprobada): además, editar umbrales/horario, usar el Simulador, guardar plano importado y enviar push de prueba.
- Toda cuenta nueva que no sea la superadmin queda **pendiente** sin permisos hasta aprobarse manualmente en la base de datos (`usuarios.estado`); el panel de aprobación es una tarea aparte, fuera de esta fase.
- Las escrituras del cliente revalidan la sesión contra el servidor antes de aplicarse; las API protegidas nunca confían en el estado local.

**No usar para decisiones operativas, acceso físico ni datos privados hasta que UTEC confirme el proveedor de identidad institucional y exista el panel de aprobación de cuentas.**

## Ejecutar en local

```bash
npm install
npm run dev
```

Para probar la PWA y las pruebas E2E, usa el build de producción (el service worker no se registra con `npm run dev`):

```bash
# Terminal 1
npm run build
npm run start -- --hostname 127.0.0.1 --port 3101

# Terminal 2, desde el mismo proyecto
npm run test:e2e
```

Playwright usa Chrome instalado en local. En CI usa Chromium, instalable con `npx playwright install --with-deps chromium`. Las pruebas de sesión usan `AUTH_TEST_BYPASS_SECRET` (provider Credentials que simula un login de superadmin sin pasar por Google real; solo activo cuando esa variable existe, y nunca en producción). `UTEC_BASE_URL` permite elegir otra instancia **de pruebas**, sin apuntar a producción.

Las trazas y capturas de fallos pueden contener datos de la sesión de prueba: permanecen ignoradas en `test-results/` y no deben publicarse sin revisar.

## Pantallas

| Ruta               | Uso                                                   |
| ------------------ | ----------------------------------------------------- |
| `/`                | Resumen de las aulas y módulos                        |
| `/modulo/[id]`     | Gráficas, umbrales y anomalías                        |
| `/alertas`         | Alertas, acuses e historial                           |
| `/aula/[codigo]`   | Plano 2D, nodos y componentes                         |
| `/pantalla/[aula]` | Vista de monitor con valores grandes                  |
| `/log`             | Filtros y CSV de diez columnas                        |
| `/simulador`       | Escenarios, velocidad y eventos manuales              |
| `/importar`        | Contorno CSV, DXF o JSON con vista previa             |
| `/ajustes`         | Sesión, umbrales, horario, contactos y notificaciones |

Se conservan redirecciones desde `/dashboard`, `/configuracion`, `/footprint`, `/aulas/:aulaId` y `/login`.

## Simulación, persistencia y offline

Cada navegador ejecuta su propio motor de reglas. Al iniciar por primera vez se simulan los últimos 30 minutos; las recargas posteriores restauran el reloj, estado del motor, alertas y acuses. Los identificadores de eventos evitan colisiones entre sesiones nuevas.

- localStorage: configuración, plano y checkpoint reciente.
- IndexedDB: historial de eventos. La vista aplica retención de 90 días; no hay copias de respaldo centrales ni sincronización entre usuarios.
- Los cambios de escenario se guardan con su instante de inicio para no reescribir las curvas anteriores ni reiniciar el CO₂ al cambiar de hora.
- Las API son demostraciones sin estado: no representan el historial privado del navegador ni garantizan la misma selección de escenario/configuración. `/api/umbrales` valida, pero no persiste cambios en servidor.
- La PWA guarda documentos y recursos visitados; evita mezclar HTML, respuestas RSC y API. **Abre las pantallas con conexión antes de depender de ellas offline.**
- Al detectar desconexión o imposibilidad de validar la conexión con el servidor, conserva las lecturas guardadas y congela el reloj. No autoriza escrituras offline. La comprobación periódica puede tardar hasta 30 segundos más el timeout de cinco segundos si el navegador no emite un evento offline.
- No se garantiza la recuperación ante borrado de datos del navegador, cuota agotada, cierre durante una escritura o conflictos entre pestañas. Exporta CSV para conservar evidencias importantes.

## Preparar un despliegue en Vercel

El repositorio de trabajo es `SirCloudzUTEC/Monitoreo-Aula-UTEC-Front`. Las correcciones se revisan en una rama y PR; **no ejecutar comandos que reemplacen `main` ni publicar producción sin validar un preview**.

En el proyecto Vercel, selecciona Next.js y configura las variables para el entorno correspondiente (Preview o Production):

| Variable                       | Requisito                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `AUTH_SECRET`                  | Secreto aleatorio de Auth.js; solo servidor, estable entre instancias                 |
| `DATABASE_URL`                 | Conexión Neon/Postgres; sin ella el login falla cerrado (no hay dónde guardar cuentas) |
| `GOOGLE_OAUTH_CLIENT_ID`       | Opcional. Cliente OAuth de Google Cloud Console, redirect URI de este entorno          |
| `GOOGLE_OAUTH_CLIENT_SECRET`   | Opcional. Secreto del cliente OAuth; solo servidor                                     |
| `SUPERADMIN_EMAIL`             | Correo `@utec.edu.pe` que arranca aprobado como superadmin                             |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública, solo si se habilita push                                                |
| `VAPID_PRIVATE_KEY`            | Clave privada push, solo servidor                                                      |
| `VAPID_SUBJECT`                | Contacto válido `mailto:...` o `https://...`, necesario para push                      |

Sin `GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET`, `/acceso` simplemente no muestra el botón de Google; el login con correo y contraseña sigue funcionando igual. Sin `DATABASE_URL` o `AUTH_SECRET`, el login falla cerrado (ningún método funciona, no hay dónde guardar cuentas ni firmar sesiones). Para generar `AUTH_SECRET`:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Guárdalo solo en la configuración privada del servidor. No adjuntes la salida a issues o commits. Rotarlo invalida las sesiones existentes.

### Web Push opcional

Genera claves con `npx web-push generate-vapid-keys`, configura las tres variables VAPID, recompila y prueba con HTTPS (o localhost) y una cuenta aprobada. En Ajustes, concede permiso y (con cuenta superadmin) envía una prueba.

La suscripción pertenece al navegador que está abierto: **no hay registro central de dispositivos ni alertas programadas en servidor al cerrar la app**. Los errores push no desactivan las alertas in-app. Correo y Telegram son adaptadores pendientes; el escalamiento visual indica contactar al responsable, no que se haya enviado un mensaje.

## Fase 2 y documentación

`MqttDataSource` es un stub: configurar `NEXT_PUBLIC_MQTT_WS_URL` no conecta hardware por sí solo. No expongas credenciales MQTT al cliente. Se requieren broker, procesador de aula y una estrategia de autenticación/sincronización antes de sustituir el simulador.

- [Decisiones](docs/DECISIONES.md)
- [Arquitectura](docs/ARQUITECTURA.md)
- [Mapeo de requisitos](docs/MAPEO_REQUISITOS.md)
- [Integración y verificación](docs/INTEGRACION.md)

El simulador no captura imágenes ni audio. Con sesión activa, los eventos del log quedan atribuidos al correo institucional real de quien los generó.
