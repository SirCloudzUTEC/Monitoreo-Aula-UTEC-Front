# Aula Digital UTEC

Frontend del monitoreo de **L-419** y **A-1001**, con un modelo fotográfico adicional de **L-418** (PI3 – UTEC): confort, calidad de aire, ruido, aforo, accesos, ventanas y estado de los nodos.

Es un cliente puro de la API REST del backend Spring Boot (`../backend`). Los datos llegan de las Raspberry Pi por MQTT al backend; el navegador solo habla con la API. No hay simulador.

**Stack:** Next.js 16 (App Router), React, TypeScript, Tailwind, shadcn/ui, Recharts, Zustand, TanStack Query, Vitest, Playwright.

## Modelo fotográfico L-418

Las rutas `/aula/L-418` y `/aula/L-418/3d` incorporan las 32 mesas trapezoidales, el recinto reservado cerrado y la circulación ampliada al ventanal. Las dimensiones son estimadas; los nodos son propuestas, no instalaciones confirmadas.

L-418 se incorpora **solo como modelo visual**, sin inventar lecturas ni cambiar el contrato Spring. `MODELOS_AULA`/`CODIGOS_MODELO_AULA` contienen el catálogo visual; `AULAS`/`CODIGOS_AULA` siguen restringidos a las dos aulas habilitadas para monitoreo. El modelo no entra en queries de estado/series, horarios, riesgo, pantalla TV ni registro de dispositivos. Su acceso conserva la sesión institucional existente.

Para habilitar telemetría en L-418 se requiere primero registrar el aula y su infraestructura en el backend y coordinar la ampliación de su contrato. Ver [fuentes e incertidumbres del modelo](docs/aula-l418.md).

## Inicio rápido

Requisitos: Node.js 22+ y el backend corriendo (por defecto en `http://localhost:8080`).

```bash
npm ci
npm run setup:local   # crea .env.local si no existe
npm run dev           # http://localhost:3000
```

Entra con una cuenta `@utec.edu.pe` creada por el superusuario. No hay registro abierto: el backend siembra al superusuario y desde `/usuarios` se crea al resto.

Para que el login funcione, el `CORS_ALLOWED_ORIGINS` del backend debe incluir exactamente `http://localhost:3000`.

## Variables de entorno

| Variable                       | Uso                                                                         |
| ------------------------------ | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`     | URL del backend, sin barra final. Obligatoria en producción                 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Opcional, para push. Misma clave pública que `VAPID_PUBLIC_KEY` del backend |

Todo lo demás (secretos, base de datos, MQTT, clave privada VAPID) vive solo en el backend. Reinicia `npm run dev` tras cambiar variables.

## Sesión y roles

- El access token (JWT, 15 min) vive solo en memoria; el refresh token es una cookie `httpOnly` del backend.
- Con frontend y backend en dominios distintos (p. ej. Vercel), el backend necesita `COOKIE_SECURE=true` y `COOKIE_SAMESITE=None`. Detalles en `docs/BACKEND_SPRINGBOOT.md` §9.
- El frontend solo oculta controles según el rol; el backend autoriza cada request.

| Rol               | Puede                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| `miembro`         | Ver datos, reportar incidentes, recibir alertas                                                       |
| `admin_operativo` | Lo anterior, más atender incidentes de sus ámbitos, editar umbrales y horario, gestionar dispositivos |
| `superadmin`      | Todo, más crear cuentas, cambiar roles, suspender y restablecer contraseñas                           |

## Pantallas

| Ruta               | Uso                                            |
| ------------------ | ---------------------------------------------- |
| `/acceso`          | Inicio de sesión                               |
| `/`                | Resumen de aulas y módulos                     |
| `/modulo/[id]`     | Gráficas, umbrales y anomalías                 |
| `/alertas`         | Alertas, acuses e historial                    |
| `/aula/[codigo]`   | Gemelo 3D, plano 2D, nodos y componentes       |
| `/pantalla/[aula]` | Vista de monitor con valores grandes           |
| `/log`             | Log de eventos y exportación CSV               |
| `/reportar`        | Reportar un incidente                          |
| `/reportes`        | Ver y atender reportes                         |
| `/dispositivos`    | Alta, rotación y bloqueo de nodos MQTT         |
| `/usuarios`        | Gestión de cuentas (superusuario)              |
| `/importar`        | Importar plano (CSV, DXF o JSON)               |
| `/ajustes`         | Contraseña, umbrales, horario y notificaciones |

Toda pantalla salvo `/acceso` exige sesión.

## Pruebas

```bash
npm test          # Vitest y autopruebas del aislamiento, sin backend real
npm run typecheck # genera los tipos de rutas Next antes de comprobar el checkout limpio
npm run lint
```

Las autopruebas de aislamiento incluidas en `npm test` requieren Google Chrome instalado. Abren Chromium mediante Playwright y usan exclusivamente servidores efímeros propios en loopback; no requieren cuentas ni un servidor Spring.

Contratos visuales de L-418 **con backend interceptado por fixtures**, sin credenciales reales:

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3112
# En otra terminal:
UTEC_BASE_URL=http://127.0.0.1:3112 npm run test:e2e:models
```

Esta suite valida WebGL, capas, reset, recarga con service worker, navegación móvil y ausencia de solicitudes operativas para L-418. También verifica redirección anónima y avisos de errores del backend. **No valida el servidor real ni sustituye la siguiente suite.**

E2E (Playwright) contra el stack real, con build de producción:

```bash
npm run build && npm run start -- --hostname 127.0.0.1 --port 3101
E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e   # en otra terminal
```

Usa una cuenta aprobada del backend. El backend debe permitir `http://127.0.0.1:3101` en CORS, y `NEXT_PUBLIC_API_BASE_URL` debe usar `127.0.0.1` (no `localhost`) para que la cookie de sesión viaje.

## Despliegue (Vercel)

1. Configura `NEXT_PUBLIC_API_BASE_URL` (HTTPS) y, si usas push, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
2. Agrega el dominio de Vercel a `CORS_ALLOWED_ORIGINS` del backend.
3. Valida en un preview antes de publicar; no reemplaces `main` sin revisión.

## Documentación

- [Backend Spring Boot](docs/BACKEND_SPRINGBOOT.md)
- [Migración frontend → backend](docs/MIGRACION_FRONTEND_BACKEND.md)
- [Arquitectura](docs/ARQUITECTURA.md)
- [Decisiones](docs/DECISIONES.md)
- [Mapeo de requisitos](docs/MAPEO_REQUISITOS.md)
- [Integración y verificación](docs/INTEGRACION.md)
