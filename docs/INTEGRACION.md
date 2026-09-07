# Integración y estabilización del gemelo digital

## Alcance

Repositorio de trabajo: `SirCloudzUTEC/Monitoreo-Aula-UTEC-Front`.
Rama: `fix/digital-twin-vercel`; `main` y el despliegue de producción no se modifican.
La representación 3D en Blender, los recorridos por pasillos y los planos oficiales quedan **fuera de esta fase**, por indicación del usuario. El plano 2D es esquemático y sus coordenadas semilla no son un levantamiento real.

## Bases conservadas

- Versión del compañero: commit `46abd1a315da2af37d700ba633b7f92ab831dc8f`, historial padre de esta rama.
- Versión local de la usuaria: `C:/Users/akemy/aula-digital-utec`, commit `981432eb8c72cf4bb064b58d43d6eace6e88ead2`; solo lectura, no se copian `.git`, `.vercel`, credenciales ni `.env.local`.
- Se reutiliza la base funcional local (reglas SysML, pruebas, importación, pantalla y PWA). Se conserva el selector de tema del compañero y se mantienen alias de sus rutas: `/dashboard`, `/configuracion`, `/footprint`, `/aulas/:aulaId` y `/login`.
- Ambos proyectos ya usan Next.js `16.3.4`. No se degrada a Next.js 15: el prompt histórico es una referencia funcional, no una orden de rehacer el proyecto ni ejecutar sus enlaces/comandos deformados.
- Se usa npm y un único `package-lock.json` para evitar selección ambigua del gestor en Vercel.

## Línea base ejecutada

- Proyecto del compañero: `npm ci`, lint y build pasan; no existe script de tests ni API SYS-09.2.
- Proyecto local: 36 tests pasan; lint sin errores, con un aviso de argumento no usado; build de producción pasa.
- Producción `https://aula-digital-utec.vercel.app`: Vercel CLI confirma `READY`, deployment `dpl_SDDYEcC7QxXbChL5FfLcvXw54wrG`. El conector MCP no tiene acceso al scope; la CLI autenticada sí. La consulta de logs de error no devolvió entradas; no prueba ausencia de fallos en el navegador.
- Playwright con Chrome del sistema: se visitaron diez rutas tanto localmente como en producción. La ruta `/ajustes` genera React #418 (desajuste de hidratación). En las restantes rutas probadas no se observaron errores JS durante la navegación inicial.
- Repro local: `/api/serie?aula=NO-EXISTE` devuelve 500; POST `/api/umbrales` con JSON `null` devuelve 500.

## Hipótesis priorizadas y comprobables

1. Hidratación: `pushSoportado()` se evalúa durante render; difiere entre SSR y navegador. Una apertura directa de `/ajustes` falla; usar un snapshot de montaje idéntico elimina la divergencia.
2. API: convertir entradas a tipos TypeScript sin validar permite aulas inexistentes y cuerpos null. Pruebas HTTP/unitarias deben obtener 400, nunca 500.
3. Persistencia: el motor reinicia IDs como `EV-00001` y IndexedDB usa `id_evento` como clave. Reiniciar sesiones puede sobrescribir eventos. Las pruebas deben conservar IDs y acuses entre recargas.
4. Simulación: los escenarios dependen de la hora real y el historial usa siempre el escenario actual. Las pruebas deben impedir cambios retrospectivos de series y reinicios del CO2 al cambiar la hora.
5. PWA: el service worker mezcla respuestas HTML/RSC/API y devuelve HTML para peticiones fallidas de cualquier tipo. Las pruebas deben verificar respuestas del tipo correcto y modo offline de solo lectura.

## Evidencia y verificación

La evidencia resumida de la validación local está en [`evidence/validation.json`](evidence/validation.json). Se guardan resultados reales y nombres de pruebas, no trazas con cookies ni archivos `.env`. Los artefactos detallados de Playwright quedan ignorados en `test-results/`.

## Correcciones de estabilización

- Ajustes renderiza capacidades del navegador sin discrepancias de hidratación.
- Entradas API inválidas reciben 400; sesiones ausentes y encabezados de rol falsificados no autorizan escrituras.
- Sesión de demo firmada en servidor: origen correcto incluso en `127.0.0.1`, revalidación previa a mutaciones locales y protección frente a respuestas tardías tras logout.
- Motor, reloj, escenarios, eventos y acuses restaurados al recargar; identificadores nuevos incluyen UUID de sesión.
- Escenario de aforo independiente del horario y CO₂ continuo a través del cambio de hora; curvas anteriores conservan su escenario.
- Caché separa documentos, RSC y API. La aplicación congela el reloj al no confirmar conectividad y conserva el estado guardado para lectura.
- UI de visualizador bloquea acuses y guardado de planos; contactos/horario y simulador verifican sesión antes de escribir.
- Configuración local reproducible y documentación de variables Vercel, límites de demo y canales no implementados.

## Cobertura comprobada localmente

| Área                                          | Comprobación                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Reglas, simulador, API, sesión y persistencia | Suite Vitest completa                                                                                   |
| Compilación                                   | Lint, TypeScript y build de producción                                                                  |
| Acceso administrativo                         | Login real vía navegador, inyección y acuse; pérdida de cookie impide escribir sin recarga              |
| Historial y CSV                               | IDs conservados al recargar; CSV de diez columnas con evento y acuse                                    |
| Offline                                       | Recarga desde caché, JSON 503 en API, reloj congelado y recuperación con conexión                       |
| Rutas                                         | Ocho rutas de escritorio, aliases de dashboard/configuración y Ajustes sin errores de hidratación       |
| Móvil                                         | Inicio, aula L-419 y Ajustes sin desbordamiento horizontal a 390 × 844                                  |
| Monitor                                       | Valores principales de la pantalla A-1001 de al menos 32 px; no equivale a lectura física a tres metros |

Se usa Chrome del sistema, Node 24 y el build de producción en Windows. Esta comprobación no certifica todos los navegadores ni un despliegue remoto. No se ha ejecutado una revisión por otro agente/modelo.

## No incluido / límites

No se integra Blender, hardware, MQTT, planos oficiales, distribución push multiusuario, correo, Telegram, cuentas institucionales ni base de datos central. El PIN compartido no sustituye autenticación de producción ni control de intentos. Cuotas de almacenamiento, cierre abrupto y conflictos entre pestañas no tienen garantía de recuperación. La prueba offline es emulación de navegador, no un ensayo físico en todos los dispositivos.

La entrega es rama + PR para revisión. No se fusiona `main` ni se publica producción; un preview de Vercel requiere configurar las variables indicadas en el README y una validación posterior en HTTPS.
