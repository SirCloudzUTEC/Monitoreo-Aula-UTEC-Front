# Auditoría de mobiliario — Aula L-419 (Laboratorio 05, Ciberseguridad)

Fuente: 5 fotografías del aula real tomadas por el equipo (septiembre 2026).
Objetivo: base de referencia para el gemelo 3D interactivo (`/aula/[codigo]/3d`).

## Datos generales observados

- Letrero oficial: **L419 · Aforo: 41 personas · Laboratorio 05 · Ciberseguridad**.
  (El `aulas.json` actual dice aforo 40 — corregir cuando se valide con Operaciones.)
- Uso real: laboratorio de cómputo, no aula de carpetas.
- Piso epóxico gris brillante; estructura de concreto expuesto.

## Inventario por zona

### Acceso (pared del pasillo)
| Elemento | Cantidad | Detalle |
|---|---|---|
| Puerta metálica marrón | 1 | Visor de vidrio vertical, brazo cierrapuertas, manija metálica |
| Mampara de vidrio | 1 tramo largo | Marcos claros, franja esmerilada a media altura, da al pasillo |
| Cartel de aula (azul) | 1 | Código, aforo y nombre del laboratorio, con QR |
| Señal SALIDA + extintor | 1 + 1 | En el pilar junto a la puerta |
| Tacho de acero | 1 | Exterior, junto a la puerta |

### Zona de trabajo
| Elemento | Cantidad aprox. | Detalle |
|---|---|---|
| Filas de mesas dobles (espalda con espalda) | **3 filas** | Tablero blanco, estructura metálica gris, jaula portacpu integrada; canaleta DATA al centro de cada par |
| Puestos de cómputo | ~36-40 | Monitor con soporte de base redonda, teclado, mouse, CPU negra en jaula |
| Sillas de oficina | ~41 | Negras, con ruedas, respaldo bajo |
| Canaletas flexibles "DATA" | 1-2 por fila doble | Bajan verticalmente del techo al centro de cada par — rasgo distintivo |
| **Grupos de mesas simples** | **2 grupos** | Junto a los ventanales que dan a la calle; mesas blancas individuales sin equipo ni jaula, sillas fijas negras |

### Frente del aula
| Elemento | Cantidad | Detalle |
|---|---|---|
| Proyector | 1 | Colgado del techo, proyecta sobre pared/écran frontal |
| Pizarras blancas | 2 fijas + 1 móvil | Marcos delgados |
| Computadora del docente | 1 | En mesa frontal |

### Fondo y lateral
| Elemento | Cantidad | Detalle |
|---|---|---|
| Pantalla táctil interactiva | 1 | Gran formato (~65"), soporte rodante |
| Credenza de almacenamiento | 1 corrida | Módulos blancos bajos con puertas, a lo largo de la pared |
| Ventanales piso a techo | fachada completa | Vista a la ciudad, carpintería clara |

### Techo e instalaciones
| Elemento | Detalle |
|---|---|
| Paneles acústicos beige | Entre vigas de concreto expuesto |
| Luminarias LED lineales | Suspendidas, distribución regular (~8) |
| Tuberías contraincendio | Rojas, con rociadores |
| Bandejas portacables | Metálicas, perforadas |
| Parlantes / AP redondos | Blancos, empotrados o superficiales |
| Detectores de humo | Distribuidos |
| Ductos HVAC | Metálicos, en sector del pasillo |

## Decisiones para el modelo 3D

1. **Generación procedural (Three.js / React Three Fiber)**, no Blender:
   el aula se construye desde `aulas.json` + un layout de mobiliario por aula.
   Blender queda reservado para cuando existan planos CAD oficiales.
2. Niveles de detalle incrementales:
   - LOD 1: cascarón (piso, paredes, vidrio, puerta, ventanas) + sensores clicables.
   - LOD 2: mobiliario (mesas, monitores, sillas, proyector, pizarras, credenza).
   - LOD 3: carácter (canaletas DATA, techo detallado, materiales) + zonas de
     peligro conectadas al estado real del simulador.
   - LOD 4: modo caminata en primera persona (WASD + mouse, colisiones) y móvil.
3. Las zonas de peligro se pintan desde eventos reales (proximidad a ventana,
   CO2, aforo), nunca como animación decorativa.
