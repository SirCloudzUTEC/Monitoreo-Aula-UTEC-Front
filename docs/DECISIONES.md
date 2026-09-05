# Decisiones de diseño

Registro de decisiones tomadas con autonomía donde el requisito era ambiguo.

## 1. Simulador 100 % determinista (funciones puras del tiempo)

Cada magnitud es una función pura de `(aula, escenario, horario, timestamp)` con ruido
sembrado (FNV-1a + mulberry32 + Box-Muller). Ventajas:

- Las API routes son *stateless*: Vercel serverless no comparte memoria entre invocaciones,
  y así cualquier instancia responde igual.
- Las gráficas muestrean cualquier rango (1 h / 24 h / 7 d) a cualquier resolución sin
  reproducir la historia tick a tick.
- Cliente y servidor coinciden sin sincronización.

## 2. Hora siempre en Lima (UTC-5 explícito)

Vercel corre en UTC y el navegador en hora local. Todo cálculo de horario usa
`horaLima`/`diaLima` (`src/lib/schedule.ts`): se desplaza el instante −5 h y se leen campos
UTC. Nunca se usa `getHours()`/`getDay()` del huso del host.

## 3. PWA con enfoque nativo de Next (sin @serwist/next)

`@serwist/next` se probó y se desinstaló: fricción con Next 16/Turbopack y una CVE en una
dependencia anidada. En su lugar: `src/app/manifest.ts` + `public/sw.js` escrito a mano
(offline read + push). Menos dependencias, mismo resultado.

## 4. Anomalías en TypeScript puro (sin TensorFlow.js)

F9 pide z-score + regla de salto + isolation forest. TF.js agregaría ~1 MB de bundle sin
beneficio a este volumen de datos; el isolation forest propio (50 árboles, submuestra 64,
semilla fija) es suficiente y determinista.

## 5. Web Push sin base de datos (fase 1)

La suscripción push vive en el navegador (service worker). `/api/push/send` recibe la
suscripción en el body y envía. Fase 2: persistir suscripciones del equipo de operaciones
y hacer *fan-out* en eventos críticos desde el servidor.

## 6. Rol y PIN simulados (fase 1)

`PIN_ADMIN = "2026"` con el rol en localStorage. La API de umbrales igual exige
`x-rol: administrador` (criterio 7). Fase 2: autenticación real (cuentas UTEC), credenciales
siempre como hash (regla de privacidad del modelo).

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
