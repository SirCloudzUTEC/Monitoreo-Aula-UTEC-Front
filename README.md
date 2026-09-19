# Aula Digital UTEC

Frontend del gemelo digital de las aulas **L-419** y **A-1001** (PI3 – UTEC): confort, calidad de aire, ruido, aforo, accesos, ventanas y estado de los nodos.

Es un cliente puro de la API REST del backend Spring Boot (`../backend`). Los datos llegan de las Raspberry Pi por MQTT al backend; el navegador solo habla con la API. No hay simulador.

**Stack:** Next.js 16 (App Router), React, TypeScript, Tailwind, shadcn/ui, Recharts, Zustand, TanStack Query, Vitest, Playwright.

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
| `/aula/[codigo]`   | Plano 2D, nodos y componentes                  |
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
npm test          # unitarias (Vitest), sin backend
npm run typecheck
npm run lint
```

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
