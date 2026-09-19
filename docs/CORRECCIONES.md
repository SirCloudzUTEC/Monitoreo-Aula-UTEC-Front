# Correcciones pendientes — backend y frontend

Revisión hecha después de conectar el frontend con `../backend` (Spring Boot). Sirve como lista de trabajo: cada hallazgo dice **dónde está**, **qué pasa**, **por qué importa** y **cómo corregirlo**.

## Cómo se hizo y qué NO se verificó

- Todo sale de **leer el código** (backend completo: servicios, controladores, seguridad, MQTT, schedulers, migraciones; frontend: todo lo escrito en el corte). Comparé además el motor de reglas del backend contra el original en TypeScript (`git show cf48c56:src/lib/rules/engine.ts`): el port es fiel, incluidas sus reglas y sus rarezas.
- **Nada se ejecutó contra el backend real.** Los hallazgos de rendimiento (B2, B12, B13) son razonamiento sobre las consultas, no mediciones. Los de sesión (B4) son deducidos del flujo de `AuthService.refrescar`; conviene reproducirlos antes de dar el arreglo por bueno.
- Severidad: **Alta** = rompe una función o expone datos; **Media** = fallo real pero con rodeo, o riesgo de operación; **Baja** = pulido/deuda; **Info** = tenerlo presente.
- El frontend ya trae 5 correcciones aplicadas en este mismo cambio (marcadas ✅ en la sección F).

---

## Backend

### Alta

**B1. Los eventos `info` nunca se cierran → tras cada reinicio todas las aulas quedan en "Alerta".**
- Dónde: `ReglaEngineService.info()` (l. ~278) guarda el evento con `cerrado=false` (valor por defecto de la entidad) y nadie lo cierra; `inicializar()` (l. ~93) carga `findByAulaAndCerradoFalse` en `st.abiertos`.
- Qué pasa: en marcha normal los `info` (ingreso, egreso, inicio_clase, luz_encendida…) no entran a `abiertos`, así que todo va bien. Pero al reiniciar, **todos** los `info` históricos se cargan como "abiertos sin acuse" y `getEstado()` (`anyMatch(!tieneAcuse)`) devuelve `Alerta` para siempre; además crece la memoria con cada evento informativo. También hace que `GET /api/eventos?abierto=true` devuelva miles de filas (el frontend lo esquiva pidiendo solo `critico` y `alerta`).
- Arreglo: `ev.setCerrado(true)` en `info()` (y en el `info` de `inyectar`); migración de datos `update eventos set cerrado = true where severidad = 'info';`; defensa adicional en `inicializar()`: ignorar `severidad = info`. Añadir un test: crear un `info`, reiniciar el motor (`inicializar()`), esperar `Libre/EnClase`, no `Alerta`.

**B2. `ultimasPorMagnitud` es una subconsulta correlacionada sobre toda la tabla `mediciones` del aula.**
- Dónde: `MedicionRepository.ultimasPorMagnitud`, usada por `GET /api/aulas/{codigo}/estado` y `/mediciones/actuales`.
- Qué pasa: `where m.aula = :aula and m.ts = (select max(m2.ts) … por nodo y magnitud)` evalúa el `max` por cada fila del aula (14 días de crudo = cientos de miles o millones). El frontend llama a `/estado` cada **5 s por aula y por pestaña abierta**, contra una base remota.
- Arreglo: `select distinct on (nodo, magnitud) … order by nodo, magnitud, ts desc` (la PK `(aula, nodo, magnitud, ts)` permite el recorrido inverso), o mejor, servir las últimas lecturas desde memoria (`EstadoInterno.ultimoValor` ya las tiene) / una tabla `lecturas_actuales` que la ingesta actualiza con upsert. Medir antes/después con `explain analyze`.

**B3. Las notificaciones push (incidentes y alertas críticas) van a TODOS los usuarios aprobados.**
- Dónde: `PushNotificationService.notificarIncidente / notificarEventoCritico → enviarATodos → repository.deUsuariosAprobados()` (sin filtro de permiso ni ámbito).
- Qué pasa: un incidente "Nuevo incidente: acoso — <ubicación>" o "robo" llega como notificación a **cada miembro** con una suscripción, aunque el ruteo por ámbito del resto del sistema (`CatalogoIncidentes`, `IncidenteService.listar`) pretende que solo lo vea el personal de ese ámbito. Es una fuga de información sensible y contradice la regla de visibilidad.
- Arreglo: para incidentes, destinatarios = usuarios con `atender_incidentes` cuyo ámbito esté en `CatalogoIncidentes.de(categoria).destinatarios()` (más superadmin). Para eventos críticos, decidir explícitamente (¿`recibir_alertas`? los miembros lo tienen) y filtrar por el permiso, no por "aprobado". Test: un miembro no recibe el push de un incidente.

**B4. La rotación del refresh token no tiene ventana de gracia: pestañas concurrentes o una respuesta perdida cierran TODAS las sesiones.**
- Dónde: `AuthService.refrescar`: si `actual.getRevocadoEn() != null` → `revocarTodos(usuario)` + auditoría `refresh_reuso_detectado`.
- Qué pasa: el navegador restaura la sesión con `POST /api/auth/refresh` al abrir cada pestaña. Dos pestañas que arrancan a la vez (restaurar sesión del navegador, "abrir todo en pestañas") envían la **misma** cookie antes de recibir la nueva: la segunda llega con un token ya rotado, se interpreta como robo y se revoca la familia completa → el usuario queda deslogueado en todo. Ocurre igual si la respuesta del refresh se pierde por la red y el cliente reintenta.
- Arreglo: tolerar el reuso de un token recién rotado durante una ventana corta (p. ej. 10–30 s, usando `revocadoEn` + `reemplazadoPor`): responder con un access token nuevo sin revocar la familia (o reenviar el sucesor). Fuera de esa ventana, mantener la detección de robo. Test: dos refresh simultáneos con la misma cookie → ambos 200. (Mitigación complementaria en el frontend: F6.)

### Media

**B5. No hay forma de reactivar una cuenta suspendida ni de desactivar/borrar un dispositivo.**
- `UsuarioService.suspender` es de un solo sentido: no existe endpoint que devuelva `estado = aprobada`, ni borrar cuentas. `restablecerPassword` no cambia el estado. Igual con `nodos.activo` (la ingesta lo filtra, pero ningún endpoint lo modifica): un dispositivo comprometido solo puede "rotarse", no revocarse.
- Arreglo: `POST /api/usuarios/{id}/reactivar` (sube `token_version`, audita) y `PUT /api/dispositivos/{id}` con `activo` (+ revocar el cliente en DynSec).

**B6. Crear un `admin_operativo` no permite asignarle ámbitos, y sin ámbitos no ve ni atiende nada.**
- `CrearUsuarioRequest` no tiene `ambitos`; `IncidenteService.ambitosDe()` devuelve vacío → `listar` responde página vacía, `atender/resolver` dan 404 (`cargarVisible`), `notificaciones` vacío. Hay que crear la cuenta y luego llamar a `PUT /usuarios/{id}/rol` con ámbitos.
- Arreglo: aceptar `ambitos` (validados) en `POST /api/usuarios` y rechazar `admin_operativo` sin al menos un ámbito. (Frontend: F1.)

**B7. Las cuentas antiguas con hash `scrypt:` no pueden entrar y además se bloquean solas.**
- `coincide()` captura el `IllegalArgumentException` del `DelegatingPasswordEncoder` (hash sin prefijo `{id}`) y devuelve `false`; `login` lo cuenta como intento fallido → 5 intentos = cuenta bloqueada 15 min. La migración V2 solo añade `token_version`; el flujo "establecer contraseña en el primer login" que prometía `BACKEND_SPRINGBOOT.md` §9 no existe (solo `restablecer-password` por un superadmin).
- Arreglo: migración que vacíe los hashes no soportados, o detectar el formato legado en `login` (sin contar el fallo) y responder con un mensaje que oriente a pedir un restablecimiento. Documentar el procedimiento.

**B8. El sembrado del superadmin revierte cambios administrativos en cada arranque.**
- `ArranqueRunner.sembrarSuperadmin`: si la cuenta de `SUPERADMIN_EMAIL` fue suspendida o degradada por otro superadmin, en el siguiente arranque vuelve a `superadmin` + `aprobada` sin aviso. Además, si `SUPERADMIN_PASSWORD_INICIAL` está vacío la contraseña generada se escribe en el log (`log.warn`), y la variable no se valida contra la política de 12+ caracteres. (Verifica también que la contraseña sembrada no sea la histórica `HolaEquipo1234` que documentaba el README anterior.)
- Arreglo: sembrar solo si **no existe ningún** superadmin activo; validar longitud; no registrar la contraseña generada (entregarla por un canal explícito).

**B9. `RateLimiterService` crece sin límite y el bloqueo de cuenta permite denegar el servicio.**
- El `ConcurrentHashMap<String, Bucket>` nunca expira claves (`login:ip:email`, `mqtt:…`): un atacante que pruebe correos aleatorios lo hace crecer sin tope. Además el límite es por *ip+email*, no por IP, así que no frena un barrido de contraseñas sobre muchos correos; y 5 fallos (de cualquiera) bloquean 15 min a un usuario legítimo cuyo correo se conozca.
- Arreglo: caché con expiración (Caffeine `expireAfterAccess`) y un límite adicional por IP; considerar backoff progresivo o bloqueo por par (ip, correo) en lugar de global por cuenta.

**B10. MQTT sobre TLS: no hay forma de confiar en la CA propia del broker.**
- `MqttListener` usa `ssl://` con el truststore por defecto de la JVM; los certificados de `deploy/mosquitto/certs` (ignorados por git, sin script de generación) son de una CA privada → `PKIX path building failed`. Tampoco se configura `setSocketFactory`. Además el certificado debe incluir el nombre `mosquitto` en el SAN para el `docker compose`.
- Arreglo: propiedad `MQTT_CA_FILE` → `SSLSocketFactory` propia; documentar/generar los certificados de desarrollo (script) y el SAN.

**B11. El aprovisionamiento en Mosquitto es "dispara y olvida".**
- `DynSecService.aprovisionar` devuelve `true` al publicar en `$CONTROL/dynamic-security/v1`, sin leer `…/response`. Si el broker rechaza los comandos (el rol admin sin permiso `publish $CONTROL/#`, nombre inválido…) el API entrega igualmente una credencial que no existe. Además `DispositivoService.registrar` aprovisiona **antes** de guardar el `Nodo`: si el guardado falla, queda un cliente huérfano en el broker.
- Arreglo: suscribirse a la respuesta, correlacionar y esperar con timeout; aprovisionar tras el guardado con compensación, o al revés con limpieza.

**B12. La ingesta es síncrona y cara por mensaje, contra una base remota.**
- Cada mensaje hace: `select` del nodo (`findByAulaCodigoAndNodo`, sin caché), `save` de la medición (con clave compuesta asignada, Spring Data hace `select` + `insert`), a veces `save` del nodo (latidos) y luego `engine.process` (`synchronized` + `@Transactional`, más `save`s de eventos), todo en el único hilo de callback de Paho. Con ~10 mensajes/s y latencia de red hacia la base se puede quedar atrás y encolar.
- Arreglo: caché de nodos activos (invalidada al registrar/rotar), `Persistable`/`insert … on conflict` para evitar el `select`, batch, y/o una cola con hilos de trabajo por aula (el motor ya serializa por `synchronized`).

### Baja

**B13. `guardarCondiciones()` escribe de más.** `ReglaTickScheduler.tick()` llama `engine.tick()` (que ya termina con `guardarCondiciones()`) y luego `engine.guardarCondiciones()` otra vez; y cada pasada hace `findById`/`deleteById` por cada clave, cambie o no. ≈ cientos de consultas por minuto contra la base. → quitar la segunda llamada y escribir solo diferencias.

**B14. La sonda de salud pública depende de la base.** El frontend usa `GET /actuator/health` para decidir "sin conexión". Con la base remota dormida (autosuspend) o lenta responde `DOWN`/tarda y la app se marca offline. → habilitar `management.endpoint.health.probes.enabled=true` y usar `/actuator/health/liveness` (no toca la DB) para el cliente. (Frontend: F5.)

**B15. Swagger UI y `/v3/api-docs` son públicos también en producción** (`SecurityConfig`). → `springdoc.api-docs.enabled=false` / `springdoc.swagger-ui.enabled=false` fuera de desarrollo (perfil).

**B16. `POST /api/auth/logout` exige un access token vigente** (cae en `anyRequest().authenticated()`) aunque solo actúa sobre la cookie. Con el token vencido no llega a revocar ni a limpiar la cookie. El frontend lo compensa refrescando antes, pero conviene tratarlo como `refresh`: `permitAll` + comprobación de `X-Client`.

**B17. Detalles de seguridad menores.** `POST /api/auth/password` no tiene rate limit ni exige `nueva != actual`; §10 promete auditar "fallos de login más allá de un umbral" y solo se auditan bloqueos y reuso de refresh.

**B18. Paginación inestable en `/api/eventos`.** Ordena solo por `ts desc`; con timestamps iguales (varios eventos del mismo tick) páginas consecutivas pueden repetir u omitir filas. → añadir `id` como desempate. (Nota: el test `paginacionYFiltrosInvalidosDan400NoCincuentaMil` sugiere 400, pero el controlador *recorta* silenciosamente `size` a 200 y `page` a ≥ 0; alinear nombre o comportamiento. Este recorte silencioso fue justo lo que truncaba el CSV del frontend: F2.)

**B19. Validaciones incompletas.** Umbrales: no se validan `umbralLux`, `umbralRuido`, `pm25Max`, `co2Aviso` (negativos), `luxObjetivo`, ni que la histéresis de temperatura sea razonable. Incidentes: `@Size(min = 10)` se evalúa sobre el texto sin recortar y luego se guarda `trim()` (puede quedar de <10 caracteres). Horario: sin validación de solapamientos ni límite de longitud de `curso`.

**B20. Notificaciones de incidentes.** `GET /api/notificaciones` no está paginado (`findByAmbito…` carga todo) y `marcarLeida` marca por ámbito, no por usuario: el primero que la lee la "lee" para todos.

### Info (tenerlo presente)

- **Un nodo que nunca envió un `latido` no genera `nodo_sin_datos`/`procesador_offline`** (los vigilantes esperan el primer latido; igual que el original). Si el hardware falla antes de latir, no hay alerta.
- **El estado del motor vive en memoria: una sola instancia.** Dos instancias duplicarían eventos y dejarían de compartir el estado.
- **Push:** el texto usa el nombre crudo del enum ("co2 alerta"); el frontend tiene nombres legibles (`CATALOGO_EVENTOS`). `POST /api/push/enviar` sin `usuarioId` difunde a todos.
- **Unidades:** el backend guarda `voc` en "ppb" y `ruido` en "dB"; el frontend muestra "índice" y "dBA" desde su propia tabla. Decidir una fuente.
- **Tests:** `BackendIntegrationTest` cubre bien auth, ingesta básica, retención y contrato; **faltan tests unitarios del motor de reglas** (`BACKEND_SPRINGBOOT.md` §11 los prometía: persistencia, histéresis, CO₂ doble, lux con clase, puerta, ventana, batería, latidos, `acusar` manual). Los casos originales están en git: `git show cf48c56:tests/rules.test.ts` y `…/scenario-regression.test.ts`.
- **Despliegue:** `docker-compose.yml` publica el 8080 sin proxy TLS y la cookie es `Secure` por defecto (solo funciona en `localhost` o detrás de HTTPS); el `.env` de ejemplo usa comentarios en línea (`COOKIE_SECURE=false   # …`), que rompen `export $(xargs < .env)`; no hay `HEALTHCHECK` en el `Dockerfile`.

---

## Frontend

### Corregido en este mismo cambio ✅

- **F2 ✅ El CSV del log se truncaba en silencio.** El backend recorta `size` a 200 y la exportación pedía 500 por página y calculaba "¿quedan más?" con 500: con 201–500 filas se descargaba solo la primera página. Ahora pide 200 y decide con el `size` que responde el servidor.
- **F3 ✅ Ventana de "huella por actor" de 500 → 200 filas** (mismo tope del servidor); el doc de migración y el comentario ya lo dicen.
- **F4 ✅ Batería y proximidad de ventana mostraban un nodo cualquiera.** El backend devuelve la última lectura *por nodo y magnitud*; `valoresDeLecturas` las pisaba unas con otras. Ahora conserva el **mínimo** (el peor caso, el que puede cruzar un umbral) para `bateria` y `proximidad_ventana`, y la más reciente para el resto. Con test.
- **F7 ✅ Se podía guardar Ajustes con valores de relleno.** Mientras cargaban umbrales/horario el formulario mostraba los valores por defecto (y un horario vacío); un admin que guardara entonces **sobrescribía** los umbrales reales o **borraba** el horario. Ahora los campos y botones quedan deshabilitados hasta que llegan los datos del servidor.
- **README ✅** ahora advierte que frontend y backend deben usar el **mismo host** (`127.0.0.1` con `127.0.0.1`, `localhost` con `localhost`): con `SameSite=Lax` la cookie de refresh no viaja entre hosts distintos y la sesión no sobrevive a una recarga.

### Pendiente

**F1. `/usuarios` no permite asignar ámbitos, y el selector de rol borra los existentes. (Alta)**
- Sin ámbitos, un `admin_operativo` no ve ningún incidente (ver B6). El formulario de creación no tiene selector de ámbitos y `cambiarRol(id, rol)` envía siempre `ambitos: []`, así que además **reasignar un rol borra los ámbitos** que tuviera.
- Arreglo: selector múltiple de ámbitos (`seguridad`, `mantenimiento`, `ti`, `bienestar`) visible para `admin_operativo`; enviarlos al crear (cuando el backend lo acepte, B6) y en `PUT /rol`; preservarlos al editar.

**F5. La sonda de conexión usa `/actuator/health` (depende de la base). (Media)** Con la base lenta/dormida la app se marca "sin conexión" y pasa a solo lectura sin que la red falle. Cambiar a `/actuator/health/liveness` cuando el backend lo exponga (B14) o, mientras tanto, tratar `503` con cuerpo de salud como "servidor alcanzable".

**F6. Varias pestañas pueden cerrar la sesión (efecto de B4). (Alta hasta que se arregle B4)** El refresh se deduplica *dentro* de una pestaña, no entre pestañas. Mitigar con `navigator.locks.request("aula-refresh", …)` (Web Locks) alrededor de `refrescarSesion()` y compartir el resultado entre pestañas con `BroadcastChannel`; es defensa en profundidad aunque el backend añada la ventana de gracia.

**F8. El logout no elimina la suscripción push. (Media)** `useCerrarSesion` llama a `/logout` pero no a `DELETE /api/push/subscripciones/{id}` (el id queda en `localStorage`, clave `pushSubId`, y no está atado al usuario). En un equipo compartido, tras salir la cuenta anterior **sigue recibiendo alertas** en ese navegador, y la siguiente cuenta que active push crea una suscripción duplicada. Arreglo: borrar la suscripción (mejor esfuerzo) antes de cerrar sesión y limpiar `pushSubId`.

**F9. No hay pantalla para cambiar la contraseña. (Media)** Las cuentas nacen con una contraseña aleatoria de 16 caracteres y el propio backend pide "cámbiala en el primer acceso", pero el frontend no usa `POST /api/auth/password` (la función `cambiarPassword` existe en `endpoints.ts` sin consumidores). Añadir una tarjeta en Ajustes (actual + nueva ≥ 12); tras cambiarla el backend revoca todas las sesiones → volver a `/acceso`.

**F10. Las lecturas obsoletas se muestran como si fueran actuales. (Media)** `GET …/estado` devuelve la última lectura *de siempre*, aunque el nodo lleve horas caído; el frontend ignora el `ts` de cada lectura y las pinta como valor en vivo (y `semaforoModulo` decide con ellas). Comparar `ts` con la hora del servidor y mostrar "sin datos hace X min" / atenuar pasado un umbral (p. ej. `2 × latidoMin`).

**F11. Los errores de carga son silenciosos. (Media)** Los hooks de react-query no exponen ni muestran errores: si un endpoint falla (403, 500), la página queda con esqueletos o vacía sin mensaje (solo se avisa la caída de conexión). Mostrar un aviso por sección o un banner global cuando alguna consulta esté en error.

**F12. Guardar el horario no es atómico. (Baja)** `useGuardarHorario` hace un `PUT` por aula (`Promise.all`); si uno falla queda medio guardado, y siempre reescribe ambas aulas aunque solo se editara una. Enviar solo las aulas modificadas y reportar cuál falló.

**F13. `NEXT_PUBLIC_API_BASE_URL` cae en `http://localhost:8080` si falta. (Media)** Es un valor que se incrusta en el bundle al compilar: si se olvida en Vercel, producción compila "bien" y luego intenta hablar con `localhost` del visitante. Fallar el build (o al menos `console.error` visible) cuando `NODE_ENV=production` y la variable no está definida.

**F14. Sin cabeceras de seguridad (CSP). (Baja/Media)** Con el access token en memoria, un XSS podría usarlo mientras dure la pestaña; una CSP con `connect-src` limitada al backend (y `script-src` sin `unsafe-inline` donde se pueda) reduce el daño. `next.config.ts` no define `headers()`.

**F15. Higiene de secretos y entorno. (Media)** El `.env.local` local y las variables de Vercel probablemente conservan `AUTH_SECRET`, `DATABASE_URL`, `GOOGLE_OAUTH_*`, `AUTH_TEST_BYPASS_SECRET`, `VAPID_PRIVATE_KEY`, `MQTT_*`. Ya no las usa el frontend: **bórralas** (sobre todo `DATABASE_URL` y `VAPID_PRIVATE_KEY`, que no deben vivir en un proyecto que sirve JS al navegador) y rota las que se hayan expuesto.

**F16. El aviso de "cuenta pendiente/suspendida" es código muerto. (Baja)** El backend rechaza el login de cuentas no aprobadas (mismo mensaje genérico) y, si una cuenta se suspende con la sesión abierta, el siguiente request da 401 y el refresh falla → vuelve a `/acceso`. El banner del `AppShell` para `estado !== "aprobada"` nunca se ve. Quitarlo o mostrar un mensaje específico si el backend llega a distinguir el caso.

**F17. Superficie del backend sin pantalla. (Info)** No se consumen: dispositivos (`/api/dispositivos`: alta, rotación de credencial, último latido), notificaciones por ámbito (`/api/notificaciones`), `GET /api/aulas` (la config sigue en `aulas.json`) ni la inyección manual de eventos. Sin pantalla de dispositivos, dar de alta un nodo hoy exige Swagger/`curl`.

**F18. `/reportes` muestra `usuario #id`** porque `IncidenteDto` no trae el correo de quien reporta. Añadir `reportadoPorEmail` al DTO para admins.

**F19. Los tests E2E están reescritos pero sin ejecutar.** Requieren backend + Chrome + `E2E_EMAIL/E2E_PASSWORD` y el mismo host en ambos lados (ver README). Ejecutarlos antes de dar el corte por bueno.

---

## Orden sugerido

1. **B1** (estado "Alerta" tras reiniciar), **B3** (fuga por push), **B4 + F6** (sesiones), **B2** (rendimiento de `/estado`).
2. **B6 + F1** (ámbitos: sin esto los admins no operan incidentes), **F9** (cambio de contraseña), **F8**.
3. **B5, B7, B8** (ciclo de vida de cuentas/dispositivos), **F10, F11** (fiabilidad de lo que se ve).
4. Resto por prioridad; y portar los tests del motor (info) antes de tocar el motor.
5. Ejecutar `npm run test:e2e` y `UTEC_API_BASE_URL=… npm test` (contrato de enums) contra el stack levantado.
