# Backend Spring Boot — plan de implementación

Plan para un backend real (Java + Spring Boot) que reemplaza la simulación actual: recibe datos de las Raspberry Pi por MQTT, corre el motor de reglas/alertas, persiste todo en la misma base Neon Postgres, y se vuelve la única fuente de verdad de usuarios y sesiones (JWT). Ver `docs/MIGRACION_FRONTEND_BACKEND.md` para lo que cambia del lado de Next.js.

Este documento es un plan, no código: cada sección incluye las decisiones tomadas y su razón, listas para implementarse.

## 1. Contexto y objetivo

Hoy `Monitoreo-Aula-UTEC-Front` es 100% simulado del lado del navegador: no hay sensores reales, no hay broker MQTT, no hay mediciones persistidas. Las únicas piezas server-side reales son Next.js hablando directo con Neon (`usuarios`, `incidentes`, `notificaciones`) y el login por correo/contraseña recién construido (Auth.js + scrypt).

Este backend reemplaza por completo esa capa. Absorbe **todas** las rutas API actuales de Next.js:

| Ruta actual (Next.js) | Reemplazada por |
|---|---|
| `GET /api/estado` | `GET /api/aulas/{codigo}/estado` |
| `GET /api/eventos` | `GET /api/eventos` |
| `GET /api/mediciones` | `GET /api/aulas/{codigo}/mediciones/actuales` |
| `GET /api/serie` | `GET /api/aulas/{codigo}/serie` |
| `GET/POST /api/umbrales` | `GET/PUT /api/umbrales` |
| `GET/POST /api/reportes` | `GET/POST /api/incidentes` |
| `POST /api/push/subscribe`, `/push/send` | `POST /api/push/subscripciones`, `/push/enviar` |
| `GET/POST /api/auth/[...nextauth]`, `/api/usuarios` | `POST /api/auth/{login,refresh,logout}`, `GET /api/auth/me`, `GET/POST /api/usuarios` |

**Fuera de alcance, a propósito:** `/api/asistente` (el chat-asistente, hoy un stub que siempre responde 501) se queda tal cual en Next.js. No se migra.

## 2. Stack

- **Java 21 (LTS) + Spring Boot 3.3.x + Maven.** Java en vez de Kotlin: más documentación/tutoriales para terminar bajo presión de entrega; Maven en vez de Gradle: es el default de Spring Initializr, más fácil de copiar ejemplos.
- Artefacto: jar ejecutable, imagen Docker `eclipse-temurin:21-jre-alpine`.
- Dependencias concretas:
  - `spring-boot-starter-web`, `-security`, `-validation`, `-data-jpa`, `-actuator`
  - `flyway-core` + `flyway-database-postgresql`
  - `org.postgresql:postgresql`
  - `io.jsonwebtoken:jjwt-api` / `jjwt-impl` / `jjwt-jackson` (JJWT — no reinventar la firma de JWT)
  - `org.eclipse.paho:org.eclipse.paho.client.mqttv3`
  - `com.bucket4j:bucket4j-core` (rate limiting)
  - `nl.martijndwars:webpush` (equivalente Java del paquete `web-push` de npm ya usado hoy)
  - `springdoc-openapi-starter-webmvc-ui` (Swagger UI, útil para la sustentación)
  - `org.owasp:dependency-check-maven` (escaneo de vulnerabilidades en el build)
- Sin MapStruct: a esta escala, mappers escritos a mano en el paquete `mapper` son más fáciles de leer/depurar para un estudiante que el procesador de anotaciones.

## 3. Estructura de paquetes (por capas)

```
com.utec.aulas
├── controller/   # @RestController — uno por recurso (AulaController, EventoController,
│                 # UmbralesController, IncidenteController, AuthController, DispositivoController,
│                 # PushController). Delgados: validan vía DTO, delegan al service.
├── service/      # Lógica de negocio: AuthService, ReglaEngineService, EventoService,
│                 # IncidenteService, UmbralesService, HorarioService, PushNotificationService,
│                 # DispositivoService, AuditoriaService.
├── repository/   # Interfaces Spring Data JPA, una por raíz de agregado.
├── domain/       # @Entity — ver sección 4.
├── dto/          # Records de request/response, validados con Bean Validation.
├── security/     # JwtService, JwtAuthenticationFilter, SecurityConfig, UserDetailsServiceImpl,
│                 # PasswordConfig (Argon2), RateLimitFilter (Bucket4j).
├── mqtt/         # MqttConfig, MqttListener, MedicionPayloadValidator, DeviceIdentityResolver.
├── mapper/       # DTO <-> entidad, a mano.
├── exception/    # Jerarquía de excepciones + GlobalExceptionHandler (ProblemDetail, RFC 7807).
├── config/       # CorsConfig, OpenApiConfig, SchedulingConfig.
└── scheduler/    # ReglaTickScheduler, RetencionScheduler.
```

## 4. Modelo de datos (entidades JPA)

**Principio: extender `db/schema.sql`, no reemplazarlo.** Ese esquema ya tiene datos reales en Neon (cuentas de usuario existentes).

### Tablas existentes, extendidas

- **`usuarios`** — se mantienen todas las columnas actuales. Se agrega `token_version int not null default 0`: se incrementa al cambiar contraseña, rol o suspender la cuenta; va como claim en el JWT, así un token robado deja de servir en la siguiente request sin necesitar una blacklist. `password_hash` cambia de formato: pasa de `scrypt:...` a Argon2id (`{argon2}$argon2id$...`) — ver sección 9 sobre por qué no son compatibles y cómo se resuelve el corte.
- **`incidentes` / `notificaciones` / `auditoria`** — se mapean tal cual, sin cambios de esquema. `auditoria` existe hoy sin ningún código que escriba en ella; en este backend sí se usa (ver sección 10).

  **Cambio de comportamiento deliberado**: hoy `POST /api/reportes` no exige sesión — si no hay una, atribuye el reporte a una cuenta demo compartida (`sistema.demo@utec.edu.pe`). El nuevo `POST /api/incidentes` **sí exige** JWT válido con permiso `reportar_incidente`; `reportado_por` siempre es el usuario real autenticado. Esto cierra un hueco real, no uno hipotético.

### Tablas nuevas

- **`refresh_tokens`** — `id`, `usuario_id → usuarios`, `token_hash` (SHA-256 del token, nunca el valor crudo), `creado_en`, `expira_en`, `revocado_en`, `reemplazado_por → refresh_tokens.id` (cadena de rotación, permite detectar reuso de un token ya rotado y revocar toda la familia), `user_agent`, `ip`.
- **`aulas`** — `codigo` (PK, `check in ('L-419','A-1001')`), `nombre`, `largo/ancho/alto numeric`, `aforo`, `puertas`, `ventanas`, `aire_acondicionado boolean`, `posiciones jsonb`, `componentes jsonb`. `jsonb` para posiciones/componentes: son datos de plano/mobiliario sin necesidad de consultarse por columna individual; normalizarlos en tablas hijas no aporta nada. Semilla vía Flyway desde el `aulas.json` actual.
- **`nodos`** — `id`, `aula_codigo → aulas`, `nodo check in ('nodoAmbiental','nodoPuerta','nodoVentana1','nodoVentana2','procesadorAula')`, único `(aula_codigo, nodo)`, `mqtt_username` único, `activo boolean`, `ultimo_latido_en`. **Sin columna de contraseña aquí a propósito** — la credencial MQTT vive en el store propio de Mosquitto, nunca en Postgres, así un dump de la base nunca filtra secretos de dispositivo.
- **`bloques_horario`** — `id`, `aula_codigo → aulas`, `dia smallint check between 0 and 6`, `inicio time`, `fin time`, `curso text`. `PUT /api/horario` reemplaza el set completo por aula en una transacción (borra e inserta), igual que el formulario del frontend edita el arreglo completo de una vez.
- **`umbrales`** — las 23 columnas de `Umbrales` (mismos nombres/tipos que hoy) + `id`, `vigente_desde timestamptz`, `creado_por → usuarios`. **Append-only, no update-in-place**: cada `PUT` inserta una fila nueva; la vigente es `order by vigente_desde desc limit 1`. Da historial de auditoría de cambios de umbral gratis.
- **`eventos`** (SYS-10.1) — las 10 columnas CSV exactas: `ts`, `aula → aulas`, `id_evento` (único, formato `EV-{sessionId}-{seq}`), `tipo check` (19 valores, ver `TipoEvento`), `severidad check in ('info','alerta','critico')`, `fuente`, `valor`, `umbral`, `actor`, `estado_resultante check in ('Cerrada','Libre','EnClase','Alerta')`; más `acuse_actor`, `acuse_ts`, `cerrado boolean default false`. Índices: `(aula, cerrado)` para la consulta caliente de "eventos abiertos" (motor de reglas + estado del aula la corren constantemente); `(aula, ts desc)` para el log paginado; índice parcial `on eventos (aula) where cerrado = false` para exprimir aún más el camino caliente.
- **`condicion_regla`** — timers de persistencia/histéresis del motor de reglas: `aula_codigo`, `clave` (ej. `temp`, `co2_aviso`, `prox:nodoVentana1`, `bat:nodoPuerta`), PK `(aula_codigo, clave)`, `desde timestamptz null`, `actualizado_en`. **Decisión**: los timers viven en memoria (`ConcurrentHashMap` dentro de `ReglaEngineService`, igual forma que el `Map<string, Condicion>` de TypeScript hoy) por performance — escribir a Postgres en cada mensaje MQTT solo para actualizar un contador de debounce es desperdicio, dado que los nodos pueden publicar cada 5s. Se toma una foto de este mapa hacia `condicion_regla` en el mismo tick programado (cada 5-10s) y al apagar limpiamente; al arrancar se restaura desde ahí. Los eventos **ya abiertos** no necesitan esta tabla — son durables en `eventos` (`cerrado=false` es la fuente de verdad), así que al arrancar el servicio reconstruye la lista de abiertos por aula directamente desde `eventos`, igual que `RuleEngine.restore()` hoy. Efecto neto: un reinicio del backend pierde a lo más un intervalo de tick de progreso de debounce todavía-no-abierto — aceptable; lo que nunca se pierde es el registro de alertas ya abiertas.
- **`mediciones`** — la tabla de series de tiempo, la única realmente voluminosa. Sin PK sustituta: clave natural `(aula, nodo, magnitud, ts)`, no hay duplicados legítimos. Columnas: `ts`, `aula → aulas`, `nodo`, `magnitud check` (13 valores), `valor_num double precision`, `valor_texto text` (solo `puerta` es textual — evita un `jsonb` polimórfico por una sola magnitud), `unidad`. Índices: `btree (aula, magnitud, ts desc)` para el patrón "serie reciente de una gráfica" que corre constantemente `/serie`; `BRIN` sobre `ts` — barato, chico, ideal para borrados masivos por rango durante la retención (un btree normal se hincharía rápido con este patrón de append+delete constante).

  **Volumen, en números**: con la cadencia documentada (`nodoAmbiental` sola publica ~8 magnitudes cada 5s), dos aulas generan del orden de cientos de miles de filas por día — bien para un semestre, mal para dejar crecer indefinidamente en un Neon gratuito. `RetencionScheduler` corre de noche: (a) resume en `mediciones_horarias` (`aula, nodo, magnitud, hora, valor_prom, valor_min, valor_max`) las filas de más de 14 días, (b) borra las filas crudas ya resumidas. Así `/serie` sigue rápido tanto para "última hora" (crudo) como "último mes" (resumen), sin necesitar TimescaleDB (que Neon no ofrece como extensión).
- **`push_subscriptions`** — ahora sí persistidas y multi-dispositivo (retira el "solo este navegador, sin registro entre dispositivos" de hoy): `id`, `usuario_id → usuarios`, `endpoint`, `p256dh`, `auth`, `user_agent`, `creado_en`. Único `(usuario_id, endpoint)` — resuscribirse en el mismo navegador actualiza en vez de duplicar. La validación de allowlist de hostname del endpoint (`fcm.googleapis.com`, `updates.push.services.mozilla.com`, `web.push.apple.com`, `*.notify.windows.com`) que ya existe en `src/lib/notify/validation.ts` se porta casi mecánicamente a un `PushSubscriptionValidator`.

## 5. Migraciones: Flyway vs. `apply-schema.mjs`

La propiedad de las migraciones pasa por completo a Spring Boot/Flyway.

1. `V1__baseline.sql` = el `db/schema.sql` actual, tal cual (ya está aplicado en la Neon viva). Se usa `flyway baseline` (`spring.flyway.baseline-on-migrate=true`, `baseline-version=1`) para que Flyway registre V1 como ya aplicado sin intentar re-ejecutar `create table if not exists` contra tablas que ya existen.
2. `V2__aulas_nodos_horario.sql`, `V3__umbrales.sql`, `V4__eventos_condicion_regla.sql`, `V5__mediciones.sql`, `V6__refresh_tokens_push.sql` — una migración por adición lógica, siempre aditivas (la única modificación a las tres tablas existentes es agregar `token_version`).
3. `scripts/apply-schema.mjs` y `db/schema.sql` dejan de ser la fuente de verdad del esquema una vez el baseline esté confirmado — se eliminan (las migraciones de Flyway quedan como único registro histórico).

## 6. Superficie REST

Todas las respuestas de error usan `ProblemDetail` (RFC 7807). La columna "Permiso" usa los strings exactos de `Permiso` en `src/lib/auth/identity.ts`.

### Autenticación

No hay auto-registro: no existe un endpoint público para crear una cuenta. La única cuenta que se crea sola es el superusuario por defecto (equivalente a `SUPERADMIN_EMAIL` hoy), sembrado una vez con un script/migración de arranque. Todas las demás cuentas las crea un `superadmin` con `POST /api/usuarios`.

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| POST | `/api/auth/login` | público | `{email, password}`; setea cookie httpOnly `refresh_token`, responde `{accessToken, cuenta}`; rechaza el login si la cuenta no existe |
| POST | `/api/auth/refresh` | público (cookie) | rota el refresh token, responde `{accessToken}` nuevo |
| POST | `/api/auth/logout` | autenticado | revoca el refresh token actual, limpia la cookie |
| GET | `/api/auth/me` | autenticado | `CuentaUsuario` fresca |
| GET | `/api/usuarios` | `gestionar_usuarios` | lista cuentas (`email`, `nombre`, `rol`, `estado`, `creado_en`; nunca `password_hash`) |
| POST | `/api/usuarios` | `gestionar_usuarios` | `{email, nombre, rol}`; solo `@utec.edu.pe`, genera una contraseña aleatoria, la hashea y crea la cuenta ya `estado='aprobada'` con `aprobado_por`/`aprobado_en`; responde `{email, password}` con la contraseña en texto plano **una sola vez**; 409 genérico si el correo ya existe |
| POST | `/api/usuarios/{id}/suspender` | `gestionar_usuarios` | `estado='suspendida'`, incrementa `token_version` |
| PUT | `/api/usuarios/{id}/rol` | `gestionar_usuarios` | `{rol, ambitos}`, incrementa `token_version` |

`gestionar_usuarios` es lo único que permite crear cuentas ahora que no hay auto-registro — sin este mínimo (ya construido en el frontend actual, `src/app/api/usuarios/route.ts` + `src/app/usuarios/page.tsx`), un `superadmin` tendría que insertar filas a mano en la base. Suspender y cambiar de rol una cuenta existente quedan como los dos endpoints adicionales mínimos; un panel completo de administración de usuarios (edición masiva, historial, etc.) queda fuera de alcance.

### Aulas y configuración

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| GET | `/api/aulas` | `ver_datos_autorizados` | configuración estática de las aulas |
| GET | `/api/aulas/{codigo}/estado` | `ver_datos_autorizados` | `EstadoAula` calculado + última lectura por magnitud |
| GET | `/api/aulas/{codigo}/mediciones/actuales` | `ver_datos_autorizados` | última lectura por magnitud |
| GET | `/api/aulas/{codigo}/serie?magnitud=&desde=&hasta=&pasoMs=` | `ver_datos_autorizados` | serie histórica, cruda o resumida según el rango |
| GET | `/api/horario` | `ver_datos_autorizados` | hoy no existe ninguna API — solo localStorage |
| PUT | `/api/horario` | `gestionar_dispositivos` | reemplaza el set completo por aula, transaccional |
| GET | `/api/umbrales` | `ver_datos_autorizados` | fila vigente |
| PUT | `/api/umbrales` | `gestionar_dispositivos` | inserta una fila nueva versionada |

### Eventos

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| GET | `/api/eventos?aula=&desde=&hasta=&severidad=&abierto=&page=&size=` | `ver_datos_autorizados` | paginado, reemplaza el replay simulado sin estado de hoy |
| POST | `/api/eventos/{idEvento}/acuse` | `atender_incidentes` | `acusar()` del lado servidor |
| POST | `/api/aulas/{codigo}/eventos/inyectar` | `gestionar_dispositivos` | opcional — override manual para operación (no es el simulador); se puede omitir si no hace falta |

### Incidentes

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| POST | `/api/incidentes` | `reportar_incidente` | atribuido al usuario autenticado, sin fallback a cuenta demo |
| GET | `/api/incidentes?propios=true` | `reportar_incidente` | reportes propios de un miembro |
| GET | `/api/incidentes?estado=&ambito=&page=` | `atender_incidentes` | listado operativo, filtrado por ámbito |
| POST | `/api/incidentes/{id}/atender` | `atender_incidentes` | |
| POST | `/api/incidentes/{id}/resolver` | `atender_incidentes` | `{estado: 'resuelto'\|'descartado'}` |
| GET | `/api/notificaciones?ambito=&leido=` | `atender_incidentes` | |
| POST | `/api/notificaciones/{id}/leido` | `atender_incidentes` | |

### Push

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| POST | `/api/push/subscripciones` | `recibir_alertas` | persistida, validada contra el mismo allowlist de hoy |
| DELETE | `/api/push/subscripciones/{id}` | `recibir_alertas` (propia) | |
| POST | `/api/push/enviar` | `gestionar_dispositivos` | envío manual/de prueba; el disparo real es interno — `ReglaEngineService` llama a `PushNotificationService` directo cuando se abre un evento crítico |

### Dispositivos

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| GET | `/api/dispositivos` | `gestionar_dispositivos` | roster + `ultimo_latido_en` |
| POST | `/api/dispositivos` | `gestionar_dispositivos` | registra `(aula, nodo)`, genera credencial MQTT — se devuelve **una sola vez** en la respuesta, nunca más recuperable |
| POST | `/api/dispositivos/{id}/rotar-credencial` | `gestionar_dispositivos` | |

## 7. Motor de reglas como servicio (`ReglaEngineService`)

Se porta `src/lib/rules/engine.ts` casi 1:1 — el diseño actual ya es lógica pura independiente del framework (cada método recibe `fechaMs`/`Date` explícito en vez de leer el reloj del sistema), lo que lo hace directamente portable y testeable.

- **Estado**: `ConcurrentHashMap<String clave, Condicion>` por aula (guarda `desde` + el `Evento` abierto), igual forma que `EstadoInterno` hoy.
- **Camino 1 — por medición (MQTT)**: `MqttListener` deserializa y valida una `Medicion` entrante, llama a `reglaEngineService.process(medicion)`, que corre el mismo switch por `magnitud` que hoy:
  - **temperatura**: alerta si `v > umbralTemp`, persiste `umbralTempPersistenciaMin`, cierra a `v <= umbralTemp - umbralTempHisteresis`.
  - **humedad**: alerta si `v < hrMin || v > hrMax`, persiste `hrPersistenciaMin`, cierra dentro de `[hrMin+2, hrMax-2]`.
  - **co2**: dos condiciones independientes de la misma lectura — `co2_aviso` (alerta, `v>=co2Aviso`) y `co2_alerta` (**crítico**, `v>=co2Alerta`), ambas persisten `co2PersistenciaMin`, cada una cierra 50ppm bajo su propio umbral.
  - **pm25**: alerta si `v>pm25Max`, persiste `pm25PersistenciaMin`, cierra a `v<=pm25Max-3`.
  - **ruido**: alerta si `v>umbralRuido`, persistencia fija de 1 minuto (no configurable), cierra a `v<=umbralRuido-3`.
  - **lux**: alerta **solo si hay clase en curso** y `v<umbralLux`, persiste `luxPersistenciaMin`, cierra al terminar la clase o `v>=umbralLux+30`. También emite info `luz_encendida`/`luz_apagada` al cruzar 150lx (por umbral, sin persistencia).
  - **ocupacion**: `aforo_excedido` **crítico** si `v>min(aforoMaximo, aula.aforo)`, persistencia **cero** (abre de inmediato), cierra a `v<=aforo`. También emite info `ingreso`/`egreso` en cada cambio de ocupación.
  - **puerta**: `puerta_abierta` alerta, persistencia diferenciada (`puertaAbiertaMaxEnClaseMin` en clase, `puertaAbiertaMaxFueraHorarioMin` fuera); cerrar la puerta limpia la condición de inmediato. Emite info `puerta_asegurada` al pasar a "asegurada".
  - **proximidad_ventana**: **crítico**, solo evaluado bajo "vigilancia" (fuera de horario, o sin clase y ocupación 0), abre si `v<distVentana` sostenido `distVentanaPersistenciaSeg` **segundos**, cierra a `v>=distVentanaHisteresis` o si termina la vigilancia. Clave por nodo (hasta 2 nodos de ventana).
  - **bateria**: alerta si `v<bateriaBaja`, persistencia cero, cierra a `v>=bateriaBaja+5`. Clave por nodo.
  - **latido**: recibir uno cierra de inmediato cualquier `nodo_sin_datos`/`procesador_offline` abierto de ese nodo.
- **Camino 2 — por tiempo**: `ReglaTickScheduler` (`@Scheduled(fixedRateString = "${reglas.tick-interval-ms:7000}")`) llama a `reglaEngineService.tick(Instant.now())`: transiciones `inicio_clase`/`fin_clase` desde `bloques_horario`, y watchdogs de heartbeat — `procesador_offline` (crítico) si `ahora - ultimoLatido > procesadorOfflineSeg` segundos; `nodo_sin_datos` (alerta) si `ahora - ultimoLatido > nodoSinDatosMin` minutos. Ambos cierran solo vía un latido fresco, nunca desde el tick mismo.
- **Arranque**: un `ApplicationRunner` (a) carga `eventos where cerrado=false` por aula al mapa en memoria — así `EstadoAula` es correcto inmediatamente tras reiniciar, no solo tras la próxima medición; (b) restaura los timers de `condicion_regla`; (c) siembra `ultimoLatido` por nodo desde `nodos.ultimo_latido_en`, para que un reinicio de rutina no dispare de golpe todos los watchdogs de `nodo_sin_datos`.
- **Acuse** (`EventoService.acusar`): setea `acuse_actor`/`acuse_ts`; si `fuente == "inyeccionManual"` también cierra de inmediato — mismo comportamiento exacto que hoy.

## 8. Ingesta MQTT

- **Broker**: **Eclipse Mosquitto** autoalojado (no un servicio administrado). Presupuesto cero, control total de TLS/ACLs, y la flota de Raspberry Pi es lo bastante chica/controlada para que autoalojar no sea una carga operativa real.
- **Integración**: `MqttAsyncClient` de Eclipse Paho, envuelto en un `@Component MqttListener implements MqttCallback` (conecta y se suscribe a `utec/aula/+/+/+` con QoS 1 desde `MqttConfig`). Deliberadamente **no** Spring Integration MQTT — esa abstracción (canales, gateways, adapters) no aporta nada aquí más allá de un callback y suma una capa que aprender/depurar sin beneficio a esta escala.
- **Autenticación de dispositivo**: **usuario/contraseña por dispositivo sobre TLS** (MQTTS, puerto 8883), vía el plugin `dynamic-security` de Mosquitto — no certificados de cliente. mTLS es la respuesta "más correcta" a largo plazo, pero provisionar/rotar una CA y certificados por Raspberry Pi es bastante más setup del que un proyecto de curso necesita; usuario/contraseña sobre TLS da la misma confidencialidad/integridad en tránsito. Se deja anotado como el upgrade natural a producción.
- **Identidad**: usuario = `{aula}__{nodo}` (ej. `L-419__nodoVentana1`), una credencial por par `(aula, nodo)`, generada por `POST /api/dispositivos`, empujada al store de `dynamic-security` de Mosquitto vía su API de control (nunca guardada como secreto recuperable en Postgres — `nodos` solo conoce el usuario).
- **ACLs por tópico**: cada rol de dispositivo obtiene **publish-only** sobre su propio set de tópicos (`utec/aula/{aula}/{nodo}/{magnitud}` para cada magnitud que ese rol emite) y **cero permiso de subscribe** — así un nodo comprometido, en el peor caso, publica basura en su propio tópico, pero nunca puede leer el tráfico de otro nodo o aula.
- **Nunca confiar en el `aula`/`nodo` del payload**: aunque las ACLs ya limitan por tópico, `MedicionPayloadValidator` cruza la identidad autenticada del cliente MQTT (resuelta desde `nodos` por el usuario de la conexión) contra el tópico donde llegó el mensaje **y** contra los campos `aula`/`nodo` del cuerpo JSON — cualquier discrepancia se descarta y se loguea, nunca se confía en ella. Es la defensa en profundidad frente a hardware de campo, que es entrada no confiable por definición.
- **Validación de payload** (manual — MQTT no tiene el pipeline `@Valid` de Spring MVC gratis): `magnitud` dentro de las 13 válidas; `valor` numérico y dentro de un rango físico sano por magnitud (ej. `temperatura` -10..60, `co2` 0..10000, `ruido` 0..140, `bateria` 0..100); `puerta` dentro de los 3 valores de `EstadoPuerta`; `ts` parseable ISO-8601 y no más de ~5 minutos desviado del reloj del servidor (protección barata contra un reloj de nodo mal configurado envenenando la serie en silencio); `aula` una de las 2 conocidas; `nodo` válido para esa aula (ej. rechazar `nodoVentana1` en A-1001, que no tiene ventanas). Los mensajes malformados se descartan con log estructurado + contador de métricas, nunca tumban el listener ni corrompen el estado del motor.

## 9. Auth JWT (usuarios humanos)

- **Access token**: JWT HS256, 15 minutos de vida, firmado con un secreto largo aleatorio en variable de entorno (`JWT_SECRET`). HS256 y no RS256: la separación asimétrica de RS256 solo se justifica cuando un servicio *distinto* necesita verificar tokens sin tener la clave de firma, y acá no aplica — es el upgrade natural si algún día aparece un segundo backend.
- **Refresh token**: aleatorio opaco de 256 bits (no un JWT), guardado **hasheado** (SHA-256) en `refresh_tokens`, 30 días de vida, **rotado en cada uso** — cada refresh revoca el token viejo y emite uno nuevo, encadenado vía `reemplazado_por`, así el reuso de un token ya rotado es detectable y puede revocar toda la familia (patrón de detección de robo).
- **Revocación sin blacklist**: `usuarios.token_version` va como claim en el JWT; cada request lo revalida contra el valor en la base (consulta indexada barata, en el mismo camino que ya carga el usuario para las verificaciones de permiso). Suspender a alguien o cambiarle el rol incrementa `token_version`, invalidando de inmediato cualquier token de acceso vigente.
- **Dónde guarda el token el frontend** (detalle completo en `docs/MIGRACION_FRONTEND_BACKEND.md`): refresh token en **cookie httpOnly + Secure** del dominio del backend (JS del navegador nunca la toca — un XSS puede robar el access token de memoria pero no la credencial de larga vida); access token devuelto en el cuerpo JSON del login/refresh y guardado **solo en memoria** del lado del frontend (nunca localStorage), enviado como `Authorization: Bearer` en cada request, renovado en silencio vía `/api/auth/refresh` ante un 401 o al cargar la página. Si frontend (Vercel) y backend terminan en dominios distintos, la cookie necesita `SameSite=None; Secure`, lo que debilita la protección CSRF de `SameSite` casi a cero — la defensa real pasa entonces a ser (a) un allowlist CORS estricto con `allowCredentials=true` sin comodín, más (b) exigir un header custom (ej. `X-Client: web`) en cada request de escritura, que un `<form>` cross-site (el vector clásico de CSRF) no puede replicar porque no puede setear headers custom — es el mismo espíritu que el `sameOrigin()` que ya existe hoy, adaptado a un escenario cross-origin.
- **Hash de contraseña: Argon2id**, vía `Argon2PasswordEncoder` de Spring Security envuelto en `DelegatingPasswordEncoder` (prefijo `{argon2}`, para poder cambiar de algoritmo después sin migración dura). Argon2id sobre BCrypt porque es la recomendación vigente de OWASP (memory-hard, resistente a GPU/ASIC) y esto es una implementación desde cero, no una migración de hashes legados. **Los hashes `scrypt:...` de Next.js no son compatibles** — con solo un puñado de cuentas de prueba existentes hoy, lo pragmático es un reseteo único: vaciar `password_hash` de las cuentas preexistentes y forzar un flujo de "establecer contraseña" en el primer login tras el corte, en vez de construir un verificador de compatibilidad scrypt para datos que apenas existen.
- **Bloqueo / anti-enumeración**: se reutilizan `usuarios.intentos_fallidos`/`bloqueado_hasta` directo — incrementa al fallar, bloquea 15 minutos al quinto fallo, resetea al acertar. Se corre una verificación Argon2 de forma/tiempo constante incluso para un correo inexistente (contra un hash señuelo fijo), y siempre se responde el mismo mensaje genérico — puerto directo de `verificarConSenuelo`.
- **Rate limiting**: Bucket4j en memoria (sin Redis, instancia única) sobre `/api/auth/login` (por IP+correo), `POST /api/usuarios` (por el `superadmin` que crea cuentas, anti-abuso), `POST /api/incidentes` (por usuario, anti-spam), y la tasa de ingesta MQTT por dispositivo (en `MqttListener`, descartando mensajes que llegan más rápido que la cadencia documentada).
- **Mapeo de autorización**: cada `Permiso` es un `GrantedAuthority`; los controladores usan `@PreAuthorize("hasAuthority('gestionar_dispositivos')")`, etc. Los permisos se calculan en el login a partir de `rol`+`estado` (misma regla que `permisosDe()`) y se embeben en el JWT; el chequeo de `token_version` es lo que mantiene una suspensión efectiva de inmediato pese al TTL de 15 minutos del token.

## 10. Checklist de seguridad (aplicado a este proyecto puntualmente)

- **Inyección SQL**: solo repositorios Spring Data JPA + `@Query` con parámetros ligados, nunca concatenación de texto — la misma disciplina que hoy tienen los `sql\`...\`` con plantillas etiquetadas, en el idioma JPA.
- **XSS**: es un backend, pero igual importa — toda respuesta es `application/json` (nunca se refleja un string de usuario en una respuesta HTML/texto), los campos libres (`descripcion`, `ubicacion`, `nombre`) se guardan y devuelven tal cual (el escape es responsabilidad del frontend al renderizar), Bean Validation acota su longitud en el servidor de todos modos.
- **CSRF**: depende de la decisión de cookies de la sección 9 — como los endpoints de escritura exigen header `Authorization: Bearer` (no solo cookie) salvo `/api/auth/refresh`, y CORS es allowlist estricto, un CSRF clásico (formulario cross-site) no puede adjuntar el header Bearer; el endpoint de refresh, que sí es solo-cookie, se protege con el header custom descrito arriba.
- **CORS**: `CorsConfigurationSource` con exactamente los orígenes conocidos de Next.js (dev local + dominio de Vercel de producción), `allowCredentials=true`, nunca `*` — la spec lo prohíbe de todos modos en cuanto hay credenciales.
- **Gestión de secretos**: `JWT_SECRET`, `DATABASE_URL`, `MQTT_ADMIN_*`, `VAPID_PRIVATE_KEY` todos en variables de entorno, nunca en el repo; rotar `JWT_SECRET` invalida todos los tokens de acceso vigentes (aceptable, son de vida corta).
- **Validación de entrada**: Bean Validation (`@NotBlank`, `@Size`, `@Pattern`, `@ValidEnum` custom) en cada DTO — `magnitud`/`tipo`/`severidad`/`rol`/`ambito`/`permiso`/`estado` validados contra los mismos allowlists que hoy existen en `identity.ts`/`incidents/catalog.ts`/`validation.ts`, límites de longitud (`ubicacion` 1-120, `descripcion` 10-2000) portados literal.
- **Validación de payload MQTT**: ver sección 8 — nunca confiar en `aula`/`nodo` provisto por el dispositivo.
- **Escaneo de dependencias**: `org.owasp:dependency-check-maven` en el build (falla ante CVEs de severidad alta), mismo espíritu que `npm audit` del lado del frontend.
- **TLS de punta a punta**: REST detrás de un proxy que termina HTTPS; MQTT solo por 8883 (TLS) — el puerto 1883 sin cifrar nunca expuesto más allá de loopback, si es que se usa para depuración local.
- **Headers de seguridad**: los defaults de Spring Security (`X-Content-Type-Options`, `X-Frame-Options`, HSTS una vez detrás de HTTPS) alcanzan — es una API JSON pura, sin HTML renderizado en el servidor.
- **Auditoría estructurada**: por fin se usa `auditoria` — se escribe una fila en: fallos de login más allá de un umbral, bloqueo/desbloqueo de cuenta, cambios de rol/estado (aprobar/suspender/rol), cambios de umbrales, inyección manual de eventos, transiciones de estado de incidentes (atender/resolver), rotación de credencial de dispositivo. `detalle jsonb` lleva el diff antes/después.
- **Rate limiting más allá del login**: cubierto en la sección 9 (incidentes, ingesta MQTT).

## 11. Estrategia de pruebas

- **Motor de reglas (unitarias)**: se portan los casos de `tests/rules.test.ts` a JUnit 5 + AssertJ — timing de persistencia (el predicado debe sostenerse la duración *completa* antes de abrir), histéresis (el predicado de cierre, no solo "bajo el umbral", es requerido), los dos umbrales independientes de CO2, el gate de `claseEnCurso` en lux, la persistencia diferenciada de puerta, el gate de vigilancia y la independencia por nodo en proximidad de ventana, la apertura inmediata de batería/ocupación, que los watchdogs de latido solo cierren con un heartbeat fresco (nunca desde el tick), y el caso especial de `acusar()` con `inyeccionManual`. El diseño actual de recibir `fechaMs`/`Instant` explícito en vez de leer el reloj del sistema es justo lo que hace esto trivial de testear sin dormir hilos — se preserva en el port.
- **Integración REST**: `@SpringBootTest(webEnvironment = RANDOM_PORT)` + `MockMvc`/`TestRestTemplate`, Testcontainers Postgres para comportamiento realista de constraints/FKs. Se porta el estilo de matriz de permisos de `tests/store-permissions.test.ts`/`tests/same-origin.test.ts` como tests parametrizados por cada combinación `(rol, estado)` — cuentas `pendiente`/`suspendida` deben dar 403 en todo sin importar el rol, requests sin autenticar dan 401. Nota: CORS lo aplica el *navegador*, no el servidor — un cliente que no sea navegador puede igual pegarle al endpoint con un Origin inválido salvo que además se mantenga una verificación de origen explícita del lado servidor en las rutas de escritura, igual que el `sameOrigin()` de hoy.
- **Ingesta MQTT**: tests rápidos in-JVM contra un broker embebido (Moquette) para el cableado del listener; un test más lento con Testcontainers usando la imagen real de `eclipse-mosquitto` con la config real de ACL/dynamic-security montada — publicar un mensaje correctamente scopeado y verificar ingesta + reacción de reglas; publicar en un tópico ajeno a la credencial del dispositivo y verificar que el **broker mismo** rechaza el publish (aplicación de ACL, capa separada de la validación de payload).

## 12. Despliegue

Docker Compose con tres servicios, en una VM chica (instancia gratuita ARM o un droplet económico — realista para presupuesto de estudiante): `app` (jar de Spring Boot), `mosquitto` (imagen oficial, solo 8883/TLS, archivos de ACL/dynamic-security montados), y un proxy reverso — **Caddy** en vez de Nginx por HTTPS automático vía Let's Encrypt con configuración casi nula, terminando TLS para la API REST y reenviando a `app`; Mosquitto maneja su propio listener TLS directo porque MQTT no es HTTP y no puede pasar por el mismo proxy reverso. Postgres no es un servicio de Compose — es la Neon existente, alcanzada por internet con `sslmode=require`; dimensionar generoso el `connection-timeout` de HikariCP y considerar el endpoint pooled de Neon, dado que su autosuspend puede hacer notablemente más lenta la primera consulta tras estar inactiva.

**Del lado de la Raspberry Pi**: instalar un cliente MQTT (`paho-mqtt` si el firmware es Python, o el puerto de Paho correspondiente al lenguaje que se use), configurarlo con el usuario/contraseña emitido para ese dispositivo y el TLS del broker, y publicar según el contrato de tópico/cadencia ya documentado en los comentarios del código actual (`utec/aula/{aula}/{nodo}/{magnitud}`) — ese contrato ya se escribió pensando en este backend, no necesita cambiar.
