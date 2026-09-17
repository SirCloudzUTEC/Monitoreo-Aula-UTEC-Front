# Recomendaciones — Panel general (Dashboard)

## Estado actual

El panel (`/`) muestra: título + subtítulo con stats en vivo (aulas libres, hora, alertas sin acuse), tarjetas de resumen por aula (`AulaSummaryCard`: estado, clase actual/próxima, aforo, 4 métricas rápidas) y una grilla de 8 tarjetas de módulo (`ModuleCard`: semáforo, valor y sparkline de 60 min por aula), dentro de `AppShell` (sidebar + topbar con reloj simulado y rol).

## Prioridad alta

1. **Alertas accionables arriba, no solo un contador.**
   Hoy el subtítulo dice "1 alerta sin acuse" en texto plano. Cámbialo por una franja o mini-lista con la(s) alerta(s) crítica(s) y un botón directo para acusar, sin tener que ir a `/alertas`.
   *Archivo: `src/app/page.tsx`*

2. **Ordenar los módulos por severidad, no por orden fijo.**
   `ORDEN_MODULOS` siempre pinta los 8 módulos en el mismo orden. Lo urgente (semáforo rojo/amarillo) debería aparecer primero, para que un vistazo rápido priorice lo que importa.
   *Archivo: `src/app/page.tsx`, `src/components/modules/module-card.tsx`*

3. **Indicadores de tendencia (↑ / ↓ / →) junto a cada valor.**
   Hoy solo hay sparklines, que requieren mirar de cerca para notar si algo sube o baja. Un ícono de tendencia da lectura instantánea.
   *Archivos: `src/components/modules/aula-summary-card.tsx`, `src/components/modules/module-card.tsx`*

4. **Skeleton de carga inicial.**
   Mientras `simNowMs` es 0, se ven "--:--:--" y valores en cero, que parecen un error más que una carga. Un skeleton comunica mejor "cargando" que un dato falso en pantalla.
   *Archivo: `src/app/page.tsx` y las tarjetas que consumen `useApp`*

## Prioridad media

5. **Franja de KPIs agregados antes de las tarjetas por aula.**
   Un resumen ejecutivo (ocupación total del campus, aulas en alerta, promedio de CO₂) da contexto global antes de entrar al detalle por aula.
   *Archivo: `src/app/page.tsx`*

6. **Accesibilidad de los semáforos de color.**
   Los puntos verde/amarillo/rojo solo llevan `title` (hover). En móvil o con lector de pantalla eso no siempre es alcanzable. Agrega texto visible o `aria-label` persistente.
   *Archivos: `src/components/modules/module-card.tsx`, `src/components/modules/aula-summary-card.tsx`*

7. **Micro-animación al actualizar un valor.**
   Un pulso sutil cuando un número cambia refuerza la sensación de "datos en vivo" sin obligar a releer cada valor.
   *Archivos: tarjetas de módulo/aula*

8. **Accesos rápidos según rol.**
   Para el rol administrador, agrega botones directos a "Simulador" o "Reportar incidente" en el propio panel, en vez de pasar por la barra lateral.
   *Archivo: `src/app/page.tsx`*

## Prioridad baja / futuro

9. **Comparar ambas aulas en un mismo gráfico** en vez de sparklines separadas por módulo — facilita ver diferencias entre L-419 y A-1001 de un vistazo.

10. **Mini-timeline del horario del día** por aula (bloques de clase) como contexto visual adicional en la tarjeta de resumen.

11. **Preparar el layout para más de 2 aulas.** El grid `xl:grid-cols-2` de `AulaSummaryCard` no escala bien si `CODIGOS_AULA` crece; conviene una vista de lista/tabla cuando el número de aulas aumente.
