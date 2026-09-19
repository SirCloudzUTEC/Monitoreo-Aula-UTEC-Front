# Correcciones — estado

Lista de hallazgos de la revisión posterior al corte frontend → backend (`../backend`, Spring Boot) y cómo quedó cada uno. Los hallazgos salieron de leer el código; los arreglos se verificaron así:

- **Backend:** `./mvnw test` → 65 tests (integración con Postgres embebido, unitarios del motor de reglas, del limitador, de DynSec, de la CA de MQTT y del arranque). El arreglo de B1 se comprobó por mutación: al quitarlo, los tests fallan.
- **Frontend:** `tsc`, ESLint y Vitest (73 pasan; otros 4, el contrato de enums, se omiten sin backend y **pasan** con él).
- **Integración real:** backend en local sobre Postgres embebido (no tu base) con un publicador sintético, frontend en producción (`next build` + `next start`) y Playwright contra ambos: **27/27** en la suite, más el test de «varias pestañas a la vez» corrido aparte (28 en total). También `contract-enums` (4/4) y `scripts/contract-smoke.mjs` contra el backend vivo.

Leyenda: ✅ resuelto · 🟡 resuelto en parte (se explica qué falta) · ➖ decisión de diseño / nada que corregir.

---

## Backend

| # | Hallazgo | Estado | Qué se hizo |
|---|---|---|---|
| B1 | Eventos `info` con `cerrado=false` → tras reiniciar, todas las aulas en «Alerta» | ✅ | `info()` guarda `cerrado=true`; `inicializar()` ignora `severidad=info`; migración `V8` cierra los existentes. Tests unitario e integración (con fila legada). |
| B2 | `ultimasPorMagnitud` correlacionada sobre toda la tabla, sondeada cada 5 s | ✅ | `LecturasActualesCache` (memoria; la ingesta la actualiza; se calienta una vez por aula con `distinct on`). Ignora lecturas fuera de orden. Test. |
| B3 | Push de incidentes/alertas a todos los usuarios aprobados | ✅ | Incidentes: solo `atender_incidentes` cuyo ámbito coincida con el ruteo de la categoría (+ superadmin). Alertas de aula: quien tenga `recibir_alertas`, explícito por permiso. Test: un miembro y un operador de otro ámbito no reciben el de «acoso». |
| B4 | Rotación de refresh sin gracia → dos pestañas cerraban todas las sesiones | ✅ | Ventana `REFRESH_GRACE_SECONDS` (30 s): reuso dentro de la ventana = carrera inocua (token nuevo, sin revocar la familia). Fuera de ella, o si el sucesor fue revocado por logout/suspensión/cambio de clave, sigue siendo robo. Tests (carrera → 200; pasada la ventana → 401 y familia quemada). Frontend: F6. |
| B5 | Sin reactivar cuentas ni bloquear dispositivos | ✅ | `POST /api/usuarios/{id}/reactivar`; `PUT /api/dispositivos/{id}` `{activo}` (la ingesta lo rechaza al instante —caché invalidada— y `disableClient`/`enableClient` en Mosquitto; si el broker no confirma, no cambia nada). Tests. |
| B6 | `admin_operativo` sin ámbitos no ve ni atiende incidentes | ✅ | `POST /api/usuarios` acepta `ambitos`; `admin_operativo` exige ≥ 1 (400 si no); los demás roles no llevan. Igual en `PUT /rol`. Tests. |
| B7 | Hashes `scrypt:` no entran y además bloquean la cuenta | ✅ | Solo cuentan como contraseña los hashes con prefijo `{id}`; sin contraseña usable el login falla sin sumar intentos (no hay nada que adivinar) y un `restablecer-password` la rescata. El sembrado también reconoce el hash legado. Test. |
| B8 | El sembrado revertía suspensiones/degradaciones en cada arranque | ✅ | Solo siembra si ningún superadmin activo puede entrar; `SUPERADMIN_PASSWORD_INICIAL` exige ≥ 12 caracteres (el arranque falla si no). Tests. 🟡 Si no defines la contraseña, la generada se sigue escribiendo **una vez** en el log (único canal documentado): define `SUPERADMIN_PASSWORD_INICIAL` en producción. |
| B9 | `RateLimiterService` sin expiración; solo límite por ip+email | ✅ | Los buckets inactivos se evictan (tarea cada 10 min + tope duro de 100 000 claves); nuevo límite por IP (30 / 15 min) además del de ip+email. Tests. 🟡 El bloqueo de cuenta tras 5 fallos sigue (diseño: protege de adivinar); quien conozca un correo puede bloquearlo 15 min, mitigado por el límite por IP. |
| B10 | MQTT/TLS sin forma de confiar en la CA propia | ✅ | `MQTT_CA_FILE` → `SSLSocketFactory` que confía solo en esa CA; `deploy/mosquitto/gen-certs.sh` genera CA + certificado con SAN `mosquitto`/`localhost`; el compose monta el `ca.crt`. Tests de la fábrica (no contra un broker real). |
| B11 | DynSec «dispara y olvida» | ✅ | Se suscribe a `$CONTROL/dynamic-security/v1/response`, correlaciona por `correlationData` y espera 5 s; solo se entrega la credencial si el broker confirmó (los «already exists» de los `create*` son inofensivos). `registrar` guarda el nodo **antes** de aprovisionar (si el broker falla, se revierte). Tests de la evaluación de respuestas. 🟡 No se probó contra un Mosquitto real. |
| B12 | Ingesta síncrona y cara por mensaje | 🟡 | Caché de nodos registrados (60 s, invalidada al alta/rotación/bloqueo), `upsert` nativo de 1 viaje (idempotente ante reentrega QoS 1) en vez de `select+insert`, y `update` directo del latido: de ~4 a ~1–2 viajes por mensaje. **Falta** una cola con hilos por aula si la cadencia real lo exige (no medido). |
| B13 | `guardarCondiciones` escribía de más | ✅ | El scheduler ya no la llama dos veces y solo se escriben diferencias respecto a lo persistido. |
| B14 | Sonda de salud dependiente de la base | ✅ | `management.endpoint.health.probes.enabled`; `/actuator/health/liveness` público. Frontend: F5. |
| B15 | Swagger público en producción | ✅ | Apagado salvo `SWAGGER_ENABLED=true`. Test (`/v3/api-docs` → 404). |
| B16 | Logout exigía access token vigente | ✅ | `permitAll` + `X-Client` (como refresh). Test. |
| B17 | `POST /api/auth/password` sin límite; auditoría prometida ausente | ✅ | 5 intentos / 15 min, `nueva ≠ actual`, y auditoría `login_fallido_reiterado` al 3.er fallo. Test. |
| B18 | Paginación inestable de `/api/eventos` | ✅ | Desempate por `id`. Test renombrado (el tamaño se recorta, no da 400). |
| B19 | Validaciones incompletas | ✅ | Umbrales (`lux`, `ruido`, `pm25`, `co2`, histéresis, `distVentana`), incidentes (longitud del texto **recortado**), horario (solapamientos; `curso` ≤ 120). Tests. |
| B20 | Notificaciones sin paginar | ✅ | `page`/`size` (≤ 200) en la consulta. ➖ Que «leído» sea por ámbito y no por usuario es el diseño (un equipo cierra la notificación de todos); documentado en `BACKEND_SPRINGBOOT.md`. |

**Info**
- ✅ Unidades alineadas con el frontend (`voc` «índice», `ruido` «dBA»); el push usa los nombres legibles del catálogo (`TipoEvento.etiqueta()`).
- ✅ **Tests unitarios del motor de reglas** (15, portados de `tests/rules.test.ts`): persistencia, histéresis, CO₂ doble, luz con clase, aforo, puerta, ventana por nodo, batería, vigilantes de latido, acuse manual, info cerrados.
- ➖ Un nodo que nunca latió no genera `nodo_sin_datos`/`procesador_offline` (igual que el original), y el estado del motor vive en memoria → una sola instancia. Sin cambios, documentados.
- ✅ `docker-compose.yml`: el 8080 solo escucha en `127.0.0.1` (poner un proxy TLS delante); `HEALTHCHECK` en el `Dockerfile`; `.env.example` sin comentarios en línea y con las variables nuevas. 🟡 Tu `backend/.env` real **no se tocó** (tiene secretos) y conserva comentarios en línea: si lo cargas con un shell (`export $(xargs < .env)`) quítalos.

---

## Frontend

| # | Hallazgo | Estado | Qué se hizo |
|---|---|---|---|
| F1 | `/usuarios` sin ámbitos; el selector de rol los borraba | ✅ | Selector de ámbitos al crear (para `admin_operativo`) y diálogo «Editar» (rol + ámbitos, parte de los actuales); regla de ≥ 1 ámbito también en el cliente. Tests. |
| F2 | CSV del log truncado (tope de 200 del servidor) | ✅ | Pide 200 y decide con el `size` que responde el servidor. |
| F3 | Ventana de la huella de 500 → 200 | ✅ | Ajustado y documentado. |
| F4 | Batería/proximidad mostraban un nodo cualquiera | ✅ | Se conserva el mínimo (peor caso). Test. |
| F5 | Sonda de conexión dependiente de la base | ✅ | Usa `/actuator/health/liveness` y lee el cuerpo de la respuesta (ver «Hallado al verificar»). |
| F6 | Varias pestañas pueden cerrar la sesión | ✅ | El refresh se serializa entre pestañas con Web Locks (`navigator.locks`). Test unitario + e2e: 4 pestañas abiertas a la vez, la sesión sobrevive. |
| F7 | Guardar Ajustes con valores de relleno | ✅ | Campos y botones deshabilitados hasta cargar el dato real. |
| F8 | Logout no borraba la suscripción push | ✅ | `useCerrarSesion` da de baja la suscripción del servidor y del navegador antes de salir (mejor esfuerzo, tope de 3 s). |
| F9 | Sin pantalla de cambio de contraseña | ✅ | Tarjeta en Ajustes (actual + nueva 12–128 + repetir); al éxito se cierra la sesión, como hace el backend. Tests. |
| F10 | Lecturas obsoletas mostradas como actuales | ✅ | Aviso «Sin datos recientes: última lectura hace X» (panel, aula y pantalla TV) pasados 5 min sin lecturas, y «todavía no ha enviado lecturas». |
| F11 | Errores de carga silenciosos | ✅ | Banner global con el mensaje del backend (403 → «tu cuenta no tiene permiso…»), oculto si el problema es de conexión. |
| F12 | Horario no atómico, reescribía ambas aulas | 🟡 | Solo se envían las aulas modificadas y el error nombra cuál falló. Sigue siendo un `PUT` por aula (el backend no ofrece uno atómico multi-aula). |
| F13 | `NEXT_PUBLIC_API_BASE_URL` caía a `localhost` | ✅ | El build/arranque de producción falla si falta. **Añadí esa variable a tu `.env.local`** (`http://localhost:8080`, sin secretos) para que `npm run build` siga funcionando. |
| F14 | Sin cabeceras de seguridad | ✅ | CSP (`connect-src` = origen + backend), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS. Comprobado en producción: un test Playwright falla ante cualquier violación de CSP en 6 rutas (incluida la 3D) y pasa. |
| F15 | Secretos obsoletos en `.env.local`/Vercel | 🟡 | `npm run setup:local` ahora **avisa** de las variables obsoletas. Borrarlas es cosa tuya (no toqué tus secretos): en tu `.env.local` siguen `AUTH_SECRET`, `AUTH_TEST_BYPASS_SECRET`, `DATABASE_URL`, `GOOGLE_OAUTH_CLIENT_ID/SECRET` y `SUPERADMIN_EMAIL`; revisa también Vercel. |
| F16 | Banner de cuenta pendiente (código muerto) | ✅ | Eliminado. |
| F17 | Backend sin pantalla | 🟡 | Nueva `/dispositivos` (alta con credencial de un solo uso, rotar, bloquear/activar, último latido). **Sin pantalla** todavía: notificaciones por ámbito (`/api/notificaciones`), `GET /api/aulas` (la config sigue en `aulas.json`) e inyección manual de eventos. |
| F18 | `/reportes` mostraba `usuario #id` | ✅ | `IncidenteDto.reportadoPorEmail` (solo en el listado operativo, no en «mis reportes»). Test. |
| F19 | E2E sin ejecutar | ✅ | Reescritos y ejecutados. El backend limita el login (10 / 15 min por ip+correo), así que la suite comparte **un** contexto autenticado por worker en vez de loguearse en cada test. |

---

## Hallado al verificar contra el stack real

Estos tres no estaban en la revisión por lectura; salieron al ejecutar Playwright:

1. **Respuestas sin leer dejaban conexiones abiertas.** La sonda de conexión y el refresh rechazado (401) no consumían el cuerpo de la respuesta: el request quedaba «abierto» hasta el `abort` de 5 s (`networkidle` nunca llegaba en `/acceso`). Ahora se lee/cancela el cuerpo (`soltar()` en `client.ts`, `response.text()` en la sonda). Tests unitarios.
2. **La suite e2e se topaba con el límite de logins del backend (429).** Es el limitador funcionando; los tests ahora reutilizan una sesión (ver F19).
3. **El fixture `context` de Playwright no era el contexto compartido**: el test offline conmutaba la red del contexto equivocado. Corregido (`page.context()`).

## Qué NO se pudo verificar

- **Mosquitto real:** el aprovisionamiento de credenciales (B11), el bloqueo en el broker (B5) y el TLS con CA propia (B10) se probaron con lógica unitaria, no contra un broker. Con el stack de `docker-compose` levantado, prueba `POST /api/dispositivos` y `PUT /api/dispositivos/{id}`.
- **Tu base remota:** nada se ejecutó contra ella; en el primer arranque, Flyway aplicará `V8__eventos_info_cerrados.sql` (un `update` de datos).
- **Navegadores distintos de Chrome** y Web Push real (sin claves VAPID en las pruebas).
- **Rendimiento (B2, B12):** los arreglos eliminan las consultas caras por construcción, pero no se midió carga real.

## Para ti (acciones manuales)

1. Borra de `.env.local` y de Vercel las variables obsoletas de F15 y rota las que hayan salido de tu equipo.
2. Define `SUPERADMIN_PASSWORD_INICIAL` (≥ 12 caracteres) en el backend de producción y quita los comentarios en línea de `backend/.env` si lo cargas con un shell.
3. En producción: proxy TLS delante del 8080, `COOKIE_SECURE=true` (+ `COOKIE_SAMESITE=None` si el frontend está en otro sitio), `CORS_ALLOWED_ORIGINS` con el dominio de Vercel, `NEXT_PUBLIC_API_BASE_URL` en Vercel.
4. Genera los certificados de MQTT con `deploy/mosquitto/gen-certs.sh` y prueba el alta de un dispositivo contra el broker real.
5. En el repo del backend quedó un archivo temporal `DevServerTmpTest.java` que se coló en tu último commit (un servidor de desarrollo con Postgres embebido que usé para las pruebas): ya está borrado del árbol de trabajo; haz commit de esa eliminación.
