# Design QA final

## Resultado

Estado: **aprobado para continuar el desarrollo funcional**.

La revisión se ejecutó en el runtime móvil protegido, sobre el dispositivo iPhone de
393 × 852 px. El chequeo de integridad de los 28 archivos del runtime y la compilación
de producción finalizaron correctamente.

## Evidencia visual

- Referencia principal: `audit/01-reference-system-overview.png`
- Referencia de progreso: `audit/02-reference-progress-flow.jpg`
- Entrada final: `audit/09-final-splash.png`
- Inicio final: `audit/10-final-home.png`
- Biblioteca final: `audit/11-final-library.png`
- Registro de ejercicio: `audit/12-final-logger.png`
- Hidratación: `audit/13-final-hydration.png`
- Medidas corporales: `audit/14-final-measures.png`
- Análisis semanal: `audit/15-final-ai-analysis.png`

## Recorridos comprobados

- Entrada con identidad plana, cita estoica y CTA funcional.
- Inicio sin desplazamiento residual, teclado fantasma ni fondos blancos.
- Rutina del día con apertura individual de ejercicios.
- Registro editable de peso, repeticiones y RPE por serie.
- Cálculo visible de volumen y e1RM estimado.
- Biblioteca con 86 ejercicios, búsqueda, filtros musculares y filtros por equipo.
- Incorporación de un ejercicio de la biblioteca a la rutina activa.
- Hidratación con objetivo editable y una botella exactamente igual a 1 L.
- Suplementos como vista separada; no existe seguimiento del sueño.
- Medidas actuales, historial, tendencias y formulario de nuevo registro.
- Fotografías por frente, espalda y ambos perfiles con protocolo consistente.
- Análisis semanal con datos utilizados, nivel de confianza y recomendaciones
  explicadas.
- Plan semanal persistente de lunes a viernes, con cambio de día desde un
  carrusel táctil.
- Pregunta de inicio de semana para reutilizar el plan anterior o comenzar
  una semana vacía.
- Cuatro series predeterminadas en todos los ejercicios, verificadas en el
  registro de Sentadilla trasera.
- Regla visible de sobrecarga progresiva basada en rango de repeticiones,
  técnica y RPE.
- Guía anatómica PNG para cuello, pecho, cintura, brazo, muslo y pantorrilla.
- Llamada real al backend local de OpenAI con respuesta JSON estructurada,
  recomendaciones trazables y foco para la semana siguiente.

## Evidencia de esta iteración

- Comparación directa con la referencia: `qa-reference-comparison-weekly.png`
- Inicio con rutina del día: `qa-weekly-home.png`
- Planificación de lunes a viernes: `qa-weekly-training.png`
- Guía visual de medidas: `qa-weekly-measurements.png`
- Análisis semanal con IA: `qa-weekly-ai.png`

## Ejercicios solicitados expresamente

- Elevación lateral con mancuernas.
- Elevación frontal con mancuernas.
- Pájaros en banco inclinado para deltoide posterior.
- Pec deck para aperturas de pecho.
- Extensión de tríceps sobre la cabeza con barra V.
- Remo con pecho apoyado en agarre cerrado.
- Remo con pecho apoyado en agarre abierto.

## Activos

La app incluye 86 PNG de ejercicios, uno por cada elemento de la biblioteca. La asignación es explícita: no existe un fallback por grupo muscular y la aplicación falla de forma visible durante el desarrollo si se incorpora un ejercicio sin imagen verificada.
Los activos son planos, oscuros y coherentes con el lenguaje visual iOS; no usan
logotipos 3D, placeholders ni dibujos CSS.

## Datos y evidencia

La lógica de progreso no trata una variación aislada como conclusión. Combina
tendencias de peso, cintura, grasa registrada, volumen, repeticiones, RPE, adherencia
y fotografías tomadas bajo un protocolo comparable. Las fuentes y límites del
análisis están documentados en `../docs/evidence-base.md`.
