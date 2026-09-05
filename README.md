# Aula Digital UTEC

Gemelo digital de dos aulas instrumentadas de UTEC (**L-419** y **A-1001**) para el curso
PI3. Es una PWA que muestra en tiempo real el confort térmico, la iluminación, la calidad
de aire, el ruido, el aforo, los accesos, el perímetro de ventanas y la salud de los nodos
de cada aula, con alertas, log auditable y un simulador determinista mientras no existe el
hardware real.

- **Stack**: Next.js (App Router) + TypeScript estricto + Tailwind + shadcn/ui + Recharts +
  Zustand + Vitest. Desplegable en Vercel sin base de datos (fase 1).
- **Idiomas**: interfaz en español; código, archivos y commits en inglés.

## Cómo correr

```bash
npm install
npm run dev        # http://localhost:3000
```

Otros comandos:

```bash
npm run build      # build de producción
npm run lint       # ESLint
npm test           # 36+ tests (Vitest)
```

### Notificaciones push (opcional en local)

1. Genera un par de claves VAPID:

   ```bash
   npx web-push generate-vapid-keys
   ```

2. Copia `.env.example` a `.env.local` y completa:

   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
   VAPID_PRIVATE_KEY=...
   ```

3. Reinicia `npm run dev`, entra a **Ajustes → Notificaciones** y pulsa
   "Activar notificaciones push".

## Mapa de la app

| Ruta | Qué es |
| --- | --- |
| `/` | Dashboard: resumen por aula + 8 módulos con semáforo y sparkline |
| `/modulo/[id]` | Detalle de un módulo: gráficas 1 h / 24 h / 7 d con umbrales y anomalías |
| `/alertas` | Alertas abiertas (acusar recibo, escalamiento) e historial |
| `/pantalla/[aula]` | Vista TV 24" a pantalla completa (letras grandes, banner crítico) |
| `/aula/[codigo]` | Gemelo del aula: plano SVG 2D, nodos, sensores y componentes |
| `/importar` | Importa el contorno del aula (CSV, DXF o JSON) con vista previa |
| `/log` | Log de eventos SYS-10.1: filtros, export CSV exacto y huella por actor |
| `/simulador` | (admin) Escenarios por aula, velocidad ×1/×10/×60, inyectar eventos |
| `/ajustes` | Umbrales, horario semanal, rol (PIN), contactos, push y sonido |

**Rol administrador**: en Ajustes, PIN `2026` (fase 1 simulado). El rol visualizador solo
lee; la API rechaza sus escrituras.

**Simulación**: al abrir la app corre sola (escenario "clase normal"). En el simulador
puedes probar `aforo_excedido`, `co2_alto`, `intruso_ventana`, `nodo_caido`, etc. A ×60,
un minuto real equivale a una hora simulada: útil para ver alertas con persistencia de
10 minutos.

## Desplegar en Vercel

1. Sube el repo a GitHub:

   ```bash
   git remote add origin https://github.com/TU_USUARIO/aula-digital-utec.git
   git branch -M main
   git push -u origin main
   ```

2. En [vercel.com](https://vercel.com) importa el repositorio (framework: Next.js, sin
   configuración extra).

3. En **Settings → Environment Variables** agrega:

   | Variable | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | clave pública VAPID |
   | `VAPID_PRIVATE_KEY` | clave privada VAPID (secreta) |
   | `NEXT_PUBLIC_MQTT_WS_URL` | (fase 2) URL WebSocket del broker MQTT |
   | `MQTT_USER` / `MQTT_PASS` | (fase 2) credenciales del broker |

4. Redeploy. La PWA queda instalable desde el navegador del celular
   ("Añadir a pantalla de inicio").

## Conectar el hardware real (fase 2)

Cuando exista el procesador de aula con broker MQTT:

1. Configura `NEXT_PUBLIC_MQTT_WS_URL`, `MQTT_USER` y `MQTT_PASS`.
2. Implementa `MqttDataSource` (`src/lib/data/data-source.ts`, ya tiene el TODO):
   suscripción a `utec/aula/+/+/+` con QoS 1; el payload ya es el formato SYS-09.2.
3. Cambia `getDataSource()` para elegir MQTT cuando la URL esté definida. Ni el motor de
   reglas ni la UI necesitan cambios.

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — capas, flujo de un tick, máquina de estados.
- [`docs/DECISIONES.md`](docs/DECISIONES.md) — decisiones tomadas y su porqué.
- [`docs/MAPEO_REQUISITOS.md`](docs/MAPEO_REQUISITOS.md) — trazabilidad SYS-id → archivo.
- [`mobile/README.md`](mobile/README.md) — cobertura móvil hoy (PWA) y plan Expo (fase 2).

## Privacidad

El sistema nunca captura imágenes ni identidades. El lector de credenciales (PN532)
almacena únicamente un hash; los actores del log son roles, no personas.
