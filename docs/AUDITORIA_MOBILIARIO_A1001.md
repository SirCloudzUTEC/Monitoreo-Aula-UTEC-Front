# Auditoría de mobiliario — Aula A-1001

Fuente: 6 fotografías del aula real tomadas por el equipo (septiembre 2026): techo hacia el
frente, ventanal lateral (vista desde la pizarra), vista desde la puerta posterior, frente del
aula, techo hacia el ventanal y vista desde el fondo. Datos confirmados por Estrella: 40 mesas,
medidas 10 × 8 × 3.2 m, 5 luminarias (3 atrás, 2 adelante), ventanal fijo, 2 puertas.
Objetivo: base de referencia para el gemelo 3D (`src/components/three/a1001-scene.tsx`, datos en
`src/components/three/a1001-layout.ts`). L-419 no comparte geometría con esta aula.

## Datos generales observados

- Aula de clase tradicional (no laboratorio): carpetas individuales mirando al frente.
- Piso vinílico (en las fotos se ve verde-azulado; en el modelo va gris claro por decisión de Estrella); frente de concreto expuesto; paredes del fondo y del
  pasillo con paneles blancos; ventanal fijo de piso a techo con vista a la ciudad.
- Orientación del modelo (mirando al frente): ventanal a la **izquierda** (z = 0), pasillo con las
  dos puertas a la **derecha** (z = W = 8 m), pizarras al **frente** (x = L = 10 m).

## Inventario por zona

### Frente (pared de concreto)
| Elemento | Cantidad | Detalle |
|---|---|---|
| Pantalla interactiva | 1 | ~75", negra, sobre soporte rodante negro con repisa; centrada frente a la pared |
| Pizarras acrílicas blancas | 2 | Una larga (~3.1 m) a la izquierda; una corta (~2.1 m) a la derecha sobre un resalte de concreto |
| Señalética | 2 | "No comer" y "Guardar silencio" sobre la pantalla |
| Parlante de pared | 1 | Negro, alto, en el extremo izquierdo |
| Caja negra de conexiones | 1 | Bajo la pizarra izquierda |
| Tomacorrientes | 4 | Al pie de la pared |
| Tacho de acero | 1 | Junto a la puerta delantera |

### Lateral izquierdo (ventanal)
| Elemento | Cantidad | Detalle |
|---|---|---|
| Ventanal fijo | 1 paño continuo | Piso a techo, marcos oscuros, montantes cada ~1.1 m, travesaños a ~0.7 m y ~2.45 m; dintel de concreto arriba |
| Pilar de concreto (fondo) y columna (frente) | 1 + 1 | La columna delantera lleva un TV pequeño y una unidad blanca de pared (parece unidad interior de aire acondicionado; pendiente confirmar) |
| Podio del docente | 1 | Blanco, ~0.95 × 0.6 × 1.05 m, con laptop; silla negra al lado |

### Lateral derecho (pasillo)
| Elemento | Cantidad | Detalle |
|---|---|---|
| Puertas | 2 | Marrones con visor angosto y manija; una en la esquina delantera, otra en la posterior; vidrio superior y letrero SALIDA |
| Franja alta de vidrio esmerilado | 1 | Corrida, de ~2.4 a ~2.95 m |
| Columna de concreto adosada | 1 | Entre ambas puertas |

### Fondo
| Elemento | Cantidad | Detalle |
|---|---|---|
| Pantalla de proyección enrollable | 1 | ~2 m de ancho, hacia el lado del ventanal |
| Letrero pequeño | 1 | Oscuro, hacia el lado del pasillo |

### Zona de trabajo
| Elemento | Cantidad | Detalle |
|---|---|---|
| Carpetas individuales | **40** | Tablero blanco ~0.6 × 0.5 m, estructura tubular gris con repisa; en 5 filas × 4 pares, pasillo central |
| Sillas tipo trineo | 41 | Negras de plástico con patín metálico; 40 de alumnos + 1 del docente |

### Techo e instalaciones
| Elemento | Detalle |
|---|---|
| Paneles acústicos blancos | Retícula de ~0.61 m |
| Vigas de concreto expuesto | Una longitudinal (con la bandeja), una transversal cerca del frente y el dintel sobre el ventanal |
| Bandejas portacables galvanizadas | Perforadas, colgadas junto a las vigas |
| Luminarias LED lineales suspendidas | **5**: 3 sobre las filas traseras, 2 en la zona delantera; eje frente–fondo |
| Proyectores | 2: uno junto a la viga delantera apuntando a la pantalla del fondo, otro junto al fondo apuntando al frente |
| Parlantes redondos de techo | 2 |
| Detectores de humo | 3 |

## Decisiones para el modelo 3D

1. Escena propia (`A1001Scene`) construida desde cero a partir de las fotos; comparte con la app
   solo el visor (`twin-viewer.tsx`), las 10 capas y los nombres de los nodos.
2. Mismo esquema de capas que el resto del gemelo: estructura, vidrios, techo y datos, luminarias,
   ventilación (unidad de pared), contraincendios (detectores y señalética de salida), mobiliario,
   equipos, sillas y sensores.
3. Vista de maqueta cortada: la pared del fondo y el vidrio se ven "abiertos" desde la cámara
   inicial; los elementos pegados a la pared del fondo miran solo hacia adentro.
4. `aulas.json`: 10 × 8 × 3.2 m, aforo 40, 2 puertas, `ventanas: 0` porque el ventanal es fijo (no
   hay nodos de ventana ni proximidad); `aireAcondicionado` se mantiene en `false` hasta confirmar
   la unidad blanca de la columna.
5. Posiciones 2D (`posiciones`): mismo eje x que el 3D y `y = 8 − z`, para que el plano 2D y el
   gemelo coincidan.
