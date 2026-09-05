# App móvil (F10)

## Fase 1: PWA

Hoy la cobertura móvil la da la propia web app:

- **Instalable**: desde Chrome/Edge/Safari móvil, "Añadir a pantalla de inicio". El manifest
  (`src/app/manifest.ts`) y el service worker (`public/sw.js`) la hacen funcionar como app.
- **Offline**: modo lectura sin conexión (el service worker sirve la última copia en caché).
- **Notificaciones push**: se activan en Ajustes (Web Push con claves VAPID).
- **Diseño móvil primero**: navegación inferior en pantallas chicas, sidebar en escritorio.

## Fase 2: app nativa con Expo (plan)

Cuando el procesador de aula real exista (broker MQTT), una app Expo/React Native aportaría:

1. **Crear el proyecto**: `npx create-expo-app aula-digital-mobile` (TypeScript).
2. **Reutilizar el dominio**: `src/lib/` de este repo (tipos, reglas, catálogo de eventos,
   anomalías) es TypeScript puro sin dependencias de navegador: se extrae a un paquete
   compartido (`@aula-digital/core`) que consumen web y móvil.
3. **Datos**: implementar `DataSource` sobre MQTT (rn-mqtt / mqtt.js con WebSocket) o consumir
   las mismas API routes desplegadas en Vercel.
4. **Notificaciones**: `expo-notifications` (push nativo APNs/FCM) reemplaza Web Push,
   detrás del mismo adaptador `NotificationChannel`.
5. **Pantallas**: mismo mapa que la web (dashboard, alertas, log, ajustes) con
   `react-navigation`; los gráficos con `victory-native`.
6. **Distribución**: EAS Build para generar APK/IPA e instalarlo en los equipos del curso.

La regla de oro: la lógica vive en `src/lib/`, las pantallas solo pintan. Así la app nativa
es una segunda "vista" del mismo gemelo digital.
