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

Abre `http://localhost:3000`. `setup:local` crea `.env.local` únicamente si no existe, con un secreto aleatorio y un PIN **exclusivo para desarrollo**. Consulta el PIN en ese archivo o en la salida del comando. Nunca subas `.env.local` a Git.

Si el archivo ya existía, completa `DEMO_ADMIN_PIN` y `AUTH_SESSION_SECRET` según `.env.example`; el script no lo sobrescribe. Cambiar variables requiere reiniciar el servidor.

### Permisos de demostración

En **Ajustes → Entrar como administrador**, introduce el PIN configurado en el servidor. La API valida el PIN y emite una cookie firmada, HttpOnly, SameSite=Strict, de ocho horas. El navegador no contiene el secreto ni recupera un rol administrativo desde localStorage.

- Visualizador: lectura, filtros y exportaciones.
- Administrador: escenarios, inyección/acuse de eventos, umbrales, horario y guardado de plano/contactos.
- Las escrituras locales revalidan la sesión; las API protegidas no confían en `x-rol`.
- La sesión se consulta al cargar, al recuperar foco/conexión y cada 30 segundos. Perder la sesión impide la siguiente escritura.

**Es una demo con PIN compartido, no autenticación institucional.** No usar para decisiones operativas, acceso físico ni datos privados. Antes de uso real hacen falta cuentas, autorización centralizada, control de intentos y persistencia compartida.

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

Playwright usa Chrome instalado en local. En CI usa Chromium, instalable con `npx playwright install --with-deps chromium`. Las pruebas toman el PIN de `UTEC_TEST_PIN` o de `DEMO_ADMIN_PIN` en `.env.local`; no uses credenciales de producción en pruebas. `UTEC_BASE_URL` permite elegir otra instancia **de pruebas**, sin apuntar a producción.

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

| Variable                       | Requisito                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `DEMO_ADMIN_PIN`               | PIN largo y distinto del de desarrollo; solo servidor                                |
| `AUTH_SESSION_SECRET`          | Secreto aleatorio de al menos 32 caracteres; solo servidor, estable entre instancias |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública, solo si se habilita push                                              |
| `VAPID_PRIVATE_KEY`            | Clave privada push, solo servidor                                                    |
| `VAPID_SUBJECT`                | Contacto válido `mailto:...` o `https://...`, necesario para push                    |

Sin las dos primeras variables, la demo permanece en lectura y el login devuelve 503 con un mensaje de configuración. Para generar un secreto de sesión:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Guárdalo solo en la configuración privada del servidor. No adjuntes la salida a issues o commits. Rotarlo invalida las sesiones existentes.

### Web Push opcional

Genera claves con `npx web-push generate-vapid-keys`, configura las tres variables VAPID, recompila y prueba con HTTPS (o localhost) y sesión administrativa. En Ajustes, concede permiso y envía una prueba.

La suscripción pertenece al navegador que está abierto: **no hay registro central de dispositivos ni alertas programadas en servidor al cerrar la app**. Los errores push no desactivan las alertas in-app. Correo y Telegram son adaptadores pendientes; el escalamiento visual indica contactar al responsable, no que se haya enviado un mensaje.

## Fase 2 y documentación

`MqttDataSource` es un stub: configurar `NEXT_PUBLIC_MQTT_WS_URL` no conecta hardware por sí solo. No expongas credenciales MQTT al cliente. Se requieren broker, procesador de aula y una estrategia de autenticación/sincronización antes de sustituir el simulador.

- [Decisiones](docs/DECISIONES.md)
- [Arquitectura](docs/ARQUITECTURA.md)
- [Mapeo de requisitos](docs/MAPEO_REQUISITOS.md)
- [Integración y verificación](docs/INTEGRACION.md)

El simulador no captura imágenes, audio ni identidades. Los actores actuales son roles de demostración, no personas autenticadas.
