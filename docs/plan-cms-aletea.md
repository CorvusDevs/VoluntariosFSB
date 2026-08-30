# Plan de implementación: CMS institucional Aletea

## Referencias de producto

Este plan traduce a producto los documentos de referencia, no los toma como
especificaciones cerradas:

- `Sistema de gestión para aletea.pdf`: flujo único de información, decisiones,
  tareas, responsables, fechas, seguimiento y cierre.
- `Reunión socios 2025 (1).pdf`: equipos reales, estructura institucional,
  proyectos y formas de colaboración de Aletea.
- La aplicación VoluntariosFSB existente: patrón de uso móvil, personas,
  asistencia, agenda y lenguaje de Fútbol sin Barreras.
- `aletea.org` e `instagram.com/aleteauy`: identidad pública, propósito
  inclusivo, tono cercano y colores institucionales.

Las fuentes se consultan como referencia cuando una decisión de contenido,
equipo o lenguaje requiera confirmación. El CMS no debe copiar datos públicos a
perfiles privados sin autorización.

## Resultado esperado

Una única aplicación interna en Cloudflare donde Aletea pueda transformar una
entrada de información en un elemento trazable:

`Información -> decisión -> tarea -> responsable -> fecha -> seguimiento -> cierre`

GitHub queda para código y respaldo técnico. Cloudflare D1 y R2 serán la fuente
operativa de datos y archivos.

## Principios de implementación

1. Una fuente de verdad y una ruta de auditoría para cada cambio.
2. Móvil primero, acciones claras y textos en español rioplatense.
3. Permisos por sección, equipo y sensibilidad de datos.
4. La agenda, tareas, proyectos, reuniones y solicitudes reutilizan personas,
   equipos, fechas y documentos. No se duplica información.
5. Alertas accionables y pocas, no ruido constante.
6. Cada módulo se habilita después de datos consistentes, pruebas y validación
   visual local.

## Módulos y prioridad

### Etapa 0: operación segura en Cloudflare

- Completar la migración a D1 y eliminar la dependencia diaria de GitHub.
- Usar Cloudflare Access y roles internos del CMS.
- Mantener auditoría de accesos y modificaciones.
- Separar fotos, perfiles de participantes y documentos sensibles.

### Etapa 1: núcleo institucional

- Equipos: Dirección, Administración, Familias, Deportes, Capacitaciones,
  Comunicación, Eventos y los equipos que se agreguen.
- Responsabilidades: responsable, coordinación, sustitución, decisiones
  permitidas, escalamiento y frecuencia de reunión.
- Tareas y seguimientos: responsable, fecha, prioridad, estado, dependencias,
  comentarios, proyecto y equipo.
- Tablero institucional: próximos 7, 15, 30 y 90 días, atrasos, decisiones,
  solicitudes, alertas y actividades.

### Etapa 2: agenda y operación cotidiana

- Agenda única para reuniones, actividades, cursos, publicaciones,
  vencimientos, cumpleaños y fechas institucionales.
- Tareas recurrentes y checklists reutilizables para eventos y actividades.
- Alertas por vencimiento, bloqueo, falta de responsable, espera prolongada y
  conflictos de agenda.
- Panel personal de seguimiento para Dirección.

### Etapa 3: gestión institucional

- Reuniones con preparación, minuta, tareas y resumen posterior.
- Registro de decisiones con motivo, responsables y documentos relacionados.
- Solicitudes entre equipos convertidas automáticamente en tareas.
- Proyectos con objetivo, cronograma, equipo, riesgos, presupuesto,
  actividades, documentos y decisiones.

### Etapa 4: conocimiento y entradas

- Centro documental con metadatos, búsqueda y vínculos iniciales a Drive.
- Formularios de voluntariado, inscripciones, actividades, eventos y pedidos
  entre equipos que alimenten el módulo correcto.
- Migración gradual de archivos a R2 solo cuando convenga.

### Etapa 5: automatización y síntesis

- Resumen semanal revisable para Dirección.
- Reglas para crear tareas desde eventos y formularios.
- Notificaciones dentro del CMS primero. Correo y WhatsApp solo para alertas
  aprobadas y realmente urgentes.

## Modelo de acceso

- Dirección: visión institucional, decisiones y configuración.
- Coordinación: gestiona los equipos y proyectos que tiene asignados.
- Integrante: sus tareas, eventos y documentos habilitados.
- Administración: personas, inscripciones, documentación y configuración.
- Consulta: solo lectura de información autorizada.

Los datos de participantes, fotos, necesidades y contactos necesitan permisos
más estrictos que el trabajo operativo general.

### Decisiones confirmadas

- Dirección conserva una vista institucional transversal. Los equipos ordenan
  responsables, filtros y colas de trabajo, pero no fragmentan el tablero de
  Dirección.
- Los documentos marcados como restringidos quedan reservados a administración.
- Los formularios pueden configurarse como públicos o internos por la persona
  que los crea.
- Perfiles institucionales: Administración tiene control completo. Dirección
  ve la operación institucional sin perfiles, fotos ni documentos restringidos.
  Coordinación gestiona únicamente sus equipos asignados. Integrante actualiza
  sus propias tareas y Consulta solo lee agenda y documentos compartidos.

### Estado de implementación, agosto de 2026

- Etapas 1 a 5: equipos, tareas, agenda, reuniones, decisiones, proyectos,
  documentos, formularios, automatizaciones y resumen de Dirección están
  disponibles en el CMS.
- Alertas: incluyen vencimientos, bloqueos, conflictos de agenda, tareas sin
  responsable y esperas prolongadas. Cada persona puede postergar una alerta
  durante siete días sin ocultarla para otros equipos y reactivarla antes de
  tiempo.
- Los cinco perfiles institucionales, el alcance por equipo y la separación de
  datos personales ya están aplicados en D1 y en la API. Al crear una cuenta de
  Coordinación o Integrante se exige asignarle al menos un equipo.
- Administración dispone de un registro institucional reciente de accesos y
  cambios. El registro no se expone a Dirección, Coordinación, Integrante ni
  Consulta.
- Las alianzas institucionales registran tipo, propósito, estado, canal de
  contacto institucional opcional y vínculo con equipos o proyectos. Se evita
  cargar datos personales sensibles.
- Los programas son registros institucionales editables. Fútbol sin Barreras
  conserva su acceso operativo directo, sin limitar el CMS a ese programa. Los
  proyectos pueden vincularse a un programa para conservar el contexto.
- Equipos y comisiones comparten un único mapa operativo. Cada unidad indica si
  es un equipo, Comisión Directiva, Comisión Fiscal, Comisión Electoral u otra
  comisión, sin duplicar integrantes, responsabilidades ni reglas de acceso.
- Si existe una Comisión Directiva, el tablero avisa cuando no hay una reunión
  planificada durante el mes. La alerta no crea reuniones automáticamente.
- Las propuestas institucionales pueden recibirse mediante un formulario interno
  o público. Registran objetivo, pasos, recursos y personas necesarias, y se
  derivan en una tarea al equipo que las evaluará.
- Las actividades y eventos provenientes de formularios pueden incluir una
  fecha propuesta. La bandeja exige revisión de Coordinación antes de preparar
  el evento en Agenda, por lo que ninguna respuesta pública publica fechas por
  sí sola.
- Las tareas recurrentes creadas por Coordinación se instancian mediante un
  Worker horario interno. Cada instancia conserva la regla y el período que la
  originó, evita duplicados y deja registro de auditoría y notificación interna
  para el responsable.
- Dirección y Administración pueden dejar constancia con nota de la revisión
  semanal del tablero. La constancia se actualiza sin duplicar tareas y queda
  registrada en la auditoría institucional.
- Cloudflare Access queda pendiente hasta que Aletea tenga un dominio bajo su
  control. Mientras tanto, la sesión interna, los perfiles y las restricciones
  de datos siguen siendo la barrera activa.

## Diseño

El CMS toma la calidez clara y accesible de VoluntariosFSB, la identidad visual
de Aletea y la energía comunitaria de sus comunicaciones. La interfaz usa la
paleta institucional como guía, alto contraste, componentes grandes para
teléfono y estados con texto además de color. El tablero será la pieza visual
distintiva: una agenda de trabajo institucional que muestra prioridades sin
parecer una planilla ni una red social.

### Centro de control, agosto de 2026

La portada del CMS no presenta módulos completos ni áreas plegables. Es un
centro de mando transversal: Hoy, Para mí, decisiones, alertas, horizonte y el
mapa vivo de Aletea. Cada área abre una página propia y mantiene una plantilla
consistente con resumen, trabajo, agenda, personas, documentos e historial.

La navegación principal se organiza en Centro de control, Mi trabajo, Agenda,
Áreas, Formularios y Biblioteca. Fútbol sin Barreras queda dentro de Deportes y
conserva su módulo operativo completo. Ajustes y cierre de sesión pertenecen al
menú de cuenta.

## Plan de mejora UI, UX y QOL, agosto de 2026

### Fase A: armazón y orientación

- Barra lateral estable en escritorio y navegación inferior en teléfono.
- Páginas reales, rutas recordadas, migas de navegación y selector de áreas.
- Centro de control transversal, sin listas completas de funciones.
- Jerarquía separada para equipos, programas, comisiones y Dirección.
- Estados de guardado y sincronización persistentes y comprensibles.

### Fase B: centro de mando y productividad

- Hoy en Aletea, Para mí, decisiones, esperas, urgencias y próximos eventos.
- Horizontes de 7, 15 y 30 días, elementos sin responsable y actividad reciente.
- Vistas guardadas, filtros acumulables, acciones rápidas y captura global.
- Solicitudes entre equipos y trazabilidad desde información hasta cierre.

### Fase C: mapa vivo y páginas de área

- Mapa visual de Familias, Deportes, Comunicación, Capacitaciones, Finanzas,
  Eventos y Administración.
- Identidad de área separada del color semántico de estado.
- Plantilla común con coordinador, próximo hito, carga de trabajo, solicitudes,
  proyectos, documentos y manual operativo del área.

### Fase D: operación cotidiana

- Formularios públicos o internos con estado, vencimiento, vista previa, enlace,
  QR, destino y bandeja de respuestas.
- Agenda mensual, semanal y de lista con recurrencia, conflictos, cumpleaños,
  fechas institucionales y plantillas.
- Alertas accionables, agrupadas y postergables.
- Biblioteca buscable con responsable, revisión y vínculos institucionales.

### Fase E: calidad transversal

- Diseño adaptable sin desborde horizontal, foco visible y navegación por teclado.
- Esqueletos de carga, vacíos explicativos y confirmación persistente de guardado.
- Iconografía SVG de biblioteca establecida y etiquetas de acción concretas.
- Pruebas de rutas, permisos, filtros, agenda, formularios y búsqueda global.

### Estado de implementación

Implementado localmente el 17 de agosto de 2026:

- Nuevo armazón CMS con barra lateral en escritorio y navegación inferior en móvil.
- Centro de control con prioridades, trabajo personal, decisiones, próximo evento,
  mapa vivo de equipos, comunicados y radar institucional.
- Páginas separadas para trabajo, agenda, áreas, formularios, biblioteca y cada
  uno de los siete equipos definidos en la referencia institucional.
- Agenda en vistas de mes, semana y lista, con diseño compacto para teléfono.
- Formularios públicos o internos con filtros, métricas, enlace compartible,
  respuestas trazables y panel de edición controlado.
- Búsqueda global, migas de navegación, filtros guardados durante la sesión,
  atajo Comando K o Control K y cierre de paneles con Escape.
- Plantilla visual de auditoría en `test/fixtures/cms-overhaul.html` para revisar
  escritorio y móvil sin tocar datos de producción.

- Objetivos táctiles de 44 px, foco visible, navegación por teclado, texto
  ampliable, movimiento reducido y estados que no dependan solo del color.
- Carga progresiva, estados vacíos accionables, caché visible, recuperación de
  errores y prevención de pérdida de cambios.
- Historial de cambios, permisos explicados y fallas de automatización
  reintentables desde la interfaz.

### Dirección visual aprobada para implementación

- Violeta institucional como estructura, magenta y turquesa como acentos.
- Fondos blancos cálidos, bordes discretos y densidad ajustada al tipo de tarea.
- Poppins para identidad y títulos, con escala más contenida para datos.
- Heroicons SVG para controles, sin emoji ni geometrías de iconos improvisadas.
- Firma visual: el mapa vivo de Aletea inspirado en la estructura presentada a
  socios en 2025. El resto de la interfaz permanece sobrio para que destaque.

## Criterios para habilitar cada etapa

- Migración D1 aplicada y verificable.
- Permisos probados para cada rol.
- Registro de auditoría para altas, cambios y eliminaciones.
- Pruebas unitarias para reglas de estado y permisos.
- Capturas en escritorio y 390 x 844 sin desborde horizontal.
- Validación explícita antes de cualquier publicación.
