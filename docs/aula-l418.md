# Aula L-418 · reconstrucción fotográfica

## Fuente y alcance

Modelo basado en las fotografías proporcionadas por Estrella, incluida la referencia adicional del espacio frente al ventanal exterior. Las fotos originales se mantienen fuera del repositorio y del despliegue.

Confirmado por la propietaria:

- Código del aula: **L-418** (el letrero L-412 visible a través del vidrio no identifica esta aula).
- **32 mesas individuales trapezoidales**: dos grupos de 16, con ocho mesas por cada lado. Los tableros tienen bases de distinta longitud y encajan alternando su orientación, con las dos hileras reflejadas. La forma y el número fueron confirmados por la propietaria; las medidas y el paso de encaje son estimados.
- Los equipos apoyados en los tableros son **laptops cerradas**.
- La **única entrada/salida** es la puerta junto al tacho. La otra puerta, junto al escritorio docente, conduce a una **zona reservada** y no es acceso general.
- Mantener la separación entre los dos grupos de mesas; la corrección es añadir la franja libre junto al ventanal exterior, no acercar los grupos.
- La puerta del escritorio corresponde a un recinto cerrado que sobresale en el aula. Ese volumen produce un entrante en la planta útil y el ensanche frente al ventanal; no se resuelve modelando solo un rectángulo más ancho.

## Observado en las fotografías

- Dos bancos longitudinales con pasillo central y circulación lateral.
- Puerta general en el lateral del pasillo, con mirilla vertical; puerta reservada en el tabique interior junto al escritorio, no en la fachada exterior vidriada.
- Dos caras blancas del recinto reservado: el lateral con la puerta y el retorno orientado hacia el resto del aula. El interior no se ve en las referencias.
- Ventanal exterior de piso a techo con perfilería clara, paños estrechos practicables y baranda interior.
- Ventanal al pasillo con rejillas altas y banda horizontal esmerilada.
- Pantalla de proyección enrollable entre dos pizarras blancas sobre bases móviles.
- Escritorio docente, silla de oficina, armarios de frente vidriado y ventiladores de pedestal.
- Piso gris, paredes blancas, columnas y vigas de concreto visto.
- Luminarias LED suspendidas, bandejas eléctricas metálicas, tuberías rojas y enrolladores de cable sobre los bancos.
- Proyector suspendido y ductos metálicos con rejillas de ventilación. Los ductos no bastan para confirmar aire acondicionado.

## Estimaciones y propuestas (no levantamiento de obra)

- Envolvente exterior parametrizada: **11.8 × 10.4 × 3.3 m**, todavía estimada, no medida en obra. El ancho del modelo se reajusta al revisar el fondo, conservando la zona de mesas y sus pasillos anteriores; no es una afirmación sobre dimensiones medidas del edificio. La planta útil excluye el recinto reservado de la esquina frontal/exterior.
- Volumen reservado aproximado de **2.6 × 2.4 m** en planta, con cerramiento y tapa opaca. El fondo provisional se amplió desde 1.6 m a petición de la propietaria. Solo se representan sus caras y puerta cerrada: **interior no levantado**, sin camas ni otros elementos o usos interiores inventados. La profundidad oculta no puede medirse en la foto y requiere comprobación en sitio.
- Fondo y distancia al ventanal ya no son constantes independientes: `crearTransversalL418(fondo)` desplaza ambos bancos en la misma cantidad que aumenta el fondo. Se conservan los 4.2 m entre centros de bancos y el margen del lado del pasillo. El paso exterior estimado hasta la huella de las sillas aumenta de 1.87 a 2.67 m; no es una certificación normativa de circulación.
- El piso útil tiene seis vértices y un ángulo entrante. La zona delante del ventanal queda libre después del retorno del recinto; ampliar la envolvente rectangular por sí solo no representa esta geometría.
- Escritorio y silla docente en el lado de la puerta reservada; tacho y señal de salida en el lado opuesto, junto al único acceso. Las ubicaciones están centralizadas en `l418-layout.ts` y reflejadas en la ficha del aula.
- Un asiento y una laptop por mesa en la primera versión: **32 sillas y 32 laptops**, cantidades derivadas del número de puestos, pendientes de confirmación independiente.
- Capacidad provisional del modelo: **32 puestos**, no equivale al aforo autorizado del ambiente.
- Cantidad de luminarias y accesorios: aproximada; el modelo no es un inventario certificado.
- Los nodos IoT y sus ubicaciones son una **propuesta de diseño**, no sensores reconocidos en las fotos. En este frontend no se crean lecturas: L-418 no está habilitada para telemetría.
- No se inventa un horario de clases: el modelo no entra en la edición ni en las consultas del horario operativo.

## Ejes y archivos

- `x = 0`: frontis de proyección; `x = L`: pared posterior blanca.
- `z = 0`: ventanal exterior; `z = W`: ventanal al pasillo.
- `y = 0`: piso; `y = H`: techo.
- Datos geométricos: `src/components/three/l418-layout.ts`.
- El visor muestra el fondo y el paso exterior estimados para identificar la revisión cargada, tanto en la vista incrustada como en `/aula/L-418/3d`.
- Escena dedicada: `src/components/three/l418-scene.tsx`.
- Cerramientos y suelo útil verificables: `src/components/three/l418-room-geometry.ts`.
- Rutas: `/aula/L-418` y `/aula/L-418/3d`.

Los muros perimetrales cercanos a la cámara se ocultan para inspeccionar el aula. El recinto reservado conserva su cerramiento opaco aunque se oculte el techo general: no se muestra un interior que no fue fotografiado. Las capas del visor conservan el comportamiento de las otras aulas.

## Verificación antes de publicar

- Ejecutar `npm test`, `npm run typecheck`, `npm run lint` y `npm run build`.
- Probar el build con `npm run start -- --hostname 127.0.0.1 --port 3102` y, en otra terminal, `UTEC_BASE_URL=http://127.0.0.1:3102 npm run test:e2e:models`.
- Comprobar las 32 piezas trapezoidales y sus aristas compartidas, sin solapamiento entre puertas, marcos, columnas o sillas.
- Comprobar el piso cóncavo sin solapamiento con la huella reservada, el hueco de su puerta interior, las dos caras del volumen y su tapa opaca con **Techo y datos** desactivado. Verificar que muebles, equipos y conductos no atraviesen el recinto.
- Desactivar **Sensores** debe ocultar tanto las esferas como las etiquetas HTML; al reactivar la capa deben reaparecer.
- Orbitar y pulsar **Reiniciar vista** debe restaurar el encuadre sin destruir el Canvas/WebGL. La prueba compara los centros de los marcadores proyectados: el tamaño del texto puede variar con la distancia.
- Conservar la restauración institucional de sesión, los roles Spring y las preferencias/planos locales existentes; no trasladar checkpoints ni sesiones demo del sandbox.
- Entregar mediante rama y PR sobre el main del equipo. No publicar las fotografías originales ni reemplazar su auth, store o transporte API con los del sandbox.
- Verificar el rótulo numérico tras una recarga normal con service worker, sin borrar almacenamiento del usuario. Usar el alias de producción, no un enlace fijo a un despliegue anterior.

## Integración con Spring Boot

`AulaCodigo` conserva el contrato de las aulas monitorizadas (L-419 y A-1001). `ModeloAulaCodigo` añade L-418 únicamente al catálogo visual. Los selectores y agregados operativos siguen usando `CODIGOS_AULA`, mientras las rutas visuales usan `CODIGOS_MODELO_AULA`.

La ficha y el visor declaran ausencia de telemetría, no un estado Cerrada/Libre ni ocupación cero. No se añaden APIs locales, simulador, credenciales demo o nuevas tablas al backend. Los fallos reales 403/500 del backend conservan su tratamiento anterior. El plano 2D está rotulado como esquema simplificado: el contorno con entrante y el cerramiento reservado se inspeccionan en 3D.

La suite `test:e2e:models` intercepta todas las llamadas al backend mediante contratos de prueba y exige cero operaciones para L-418. Comprueba la frontera frontend y sus regresiones, no autentica contra Spring ni valida instalaciones reales. `test:e2e` mantiene sus requisitos de backend, CORS y cuenta aprobada.
