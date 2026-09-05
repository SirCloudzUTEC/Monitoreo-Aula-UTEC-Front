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

## 6. Sesión de demostración validada por servidor (fase 1)

Se descarta el PIN incorporado en el bundle y el encabezado `x-rol`. El PIN vive en `DEMO_ADMIN_PIN`; una cookie HMAC firmada con `AUTH_SESSION_SECRET`, HttpOnly, SameSite=Strict y Secure bajo HTTPS autoriza las API. El origen se compara con el Host real porque NextURL normaliza las direcciones loopback; no se confía en forwarded-host.

Las mutaciones locales consultan `/api/session` antes de escribir. Una respuesta tardía no restaura permisos después del logout. La sesión se revisa también al recuperar foco/conexión y cada 30 segundos. El servidor debe tener el mismo secreto en todas sus instancias; no se generan secretos por petición.

No es autorización multiusuario de producción: el almacenamiento local sigue bajo control del navegador, el PIN es compartido y falta control de intentos. Fase 2: cuentas institucionales, persistencia central y autorización de cada recurso.

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
