# Plan extensivo de QOL y adiciones basado en los audios

## 1. Resultado deseado

Una persona sin capacitación técnica debe poder entrar al gestor y completar cuatro recorridos sin ayuda externa:

1. Crear o encontrar un equipo y agregarle personas.
2. Crear un proyecto dentro de Familias y organizar sus actividades o tareas.
3. Dar acceso a otra persona, asignarle trabajo y saber cómo será avisada.
4. Compartir un enlace o archivo necesario para completar una tarea.

El sistema debe explicar qué está pasando, ofrecer la siguiente acción correcta y evitar que la persona tenga que adivinar dónde está cada función.

## 2. Demandas detectadas

### Demanda A, equipos e integrantes

La persona no encuentra cómo crear un equipo ni cómo agregar personas a Familias. Busca acciones como Más, Agregar o Crear y no identifica el recorrido correcto.

### Demanda B, proyectos y trabajo relacionado

La persona necesita representar proyectos reales dentro de Familias, incluyendo Familias en Red, Grupos de Apoyo Virtual, Atención a Familias por WhatsApp y Estimulación Motriz a través de la Plástica. También necesita distinguir proyectos, actividades y tareas.

### Demanda C, accesos, asignaciones y avisos

La persona necesita saber si puede dar acceso a coordinadores e integrantes, asignarles tareas y confirmar si recibirán una notificación dentro del gestor, en el teléfono o por otro medio.

### Demanda D, materiales de trabajo

La persona necesita adjuntar o compartir recursos, especialmente enlaces de Canva, para que quien recibe la tarea tenga todo lo necesario para completarla.

## 3. Estado actual que debe conservarse

- Ya existe administración de integrantes desde Accesos y desde cada equipo.
- Ya existe creación de proyectos, tareas y actividades con asociación a equipos.
- Ya existe una sección de Ayuda con búsqueda y respuestas sobre estos recorridos.
- Las notificaciones actuales son internas. La persona debe entrar al gestor para verlas.
- Un enlace puede guardarse como texto dentro de la descripción de una tarea, pero todavía no existe una experiencia dedicada de recursos o adjuntos.

## 4. Principios de QOL

- Una acción principal visible por pantalla.
- Estados vacíos que expliquen qué falta y ofrezcan el botón correcto.
- Mismos nombres para la misma acción en todo el sistema.
- Formularios progresivos: primero lo imprescindible, luego las opciones avanzadas.
- Confirmaciones específicas: qué se creó, dónde quedó y quién quedó asignado.
- Navegación de regreso que conserve el contexto del equipo o proyecto.
- Ayuda contextual junto a la duda, sin obligar a abandonar el formulario.
- Permisos explicados en lenguaje cotidiano.
- Celular como recorrido completo, no como versión recortada.
- Historial institucional para cambios de acceso, equipo, responsable, fecha y recurso.

## 5. Prioridades recomendadas

### P0, orientación y recorridos básicos

Son cambios de bajo riesgo y alto impacto. Deben ejecutarse primero.

#### 5.1 Acciones visibles en estados vacíos

- En un equipo sin integrantes, mostrar `Agregar integrante`.
- En un equipo sin proyectos, mostrar `Crear primer proyecto`.
- En un proyecto sin tareas, mostrar `Agregar primera tarea`.
- En una tarea sin responsable, mostrar `Asignar responsable`.
- En una tarea sin recursos, mostrar `Agregar enlace o archivo` cuando esa función exista.
- Evitar tarjetas vacías que solo digan que no hay contenido.

Criterio de aceptación: cada estado vacío contiene una explicación breve y una acción que abre el formulario correcto con el equipo o proyecto ya seleccionado.

#### 5.2 Acciones rápidas desde cada equipo

- Colocar en la cabecera del equipo: `Agregar integrante`, `Nuevo proyecto` y `Nueva tarea`.
- Mantener `Gestionar integrantes` como acceso secundario para cambios masivos.
- En celular, presentar estas acciones en un menú compacto que no tape contenido.
- Recordar la última sección abierta dentro del equipo.

Criterio de aceptación: desde Familias se puede iniciar cualquiera de los tres recorridos en un máximo de dos toques.

#### 5.3 Formularios con contexto preseleccionado

- Si la acción parte desde Familias, preseleccionar Familias.
- Si parte desde un proyecto, preseleccionar proyecto y equipo.
- Si parte desde una actividad, proponer equipo, proyecto, responsable y fecha relacionados.
- Explicar qué valores fueron sugeridos y permitir cambiarlos.
- No borrar el borrador al cerrar accidentalmente un desplegable o volver atrás.

Criterio de aceptación: la persona no debe volver a elegir información que el sistema ya conoce por el lugar desde donde inició la acción.

#### 5.4 Confirmaciones y próximos pasos

- Después de agregar un integrante, ofrecer `Asignar primera tarea`.
- Después de crear un proyecto, ofrecer `Agregar actividad` y `Agregar tarea`.
- Después de crear una tarea, mostrar a quién se asignó y dónde aparecerá.
- Si no habrá aviso externo, decirlo en la confirmación sin generar una expectativa falsa.

Criterio de aceptación: cada alta termina con una confirmación específica y una siguiente acción opcional.

## 6. P1, administración de equipos y personas

### 6.1 Editor unificado de integrantes

- Mostrar foto, nombre, perfil de acceso, función en el equipo y estado de cuenta.
- Permitir buscar por nombre o usuario.
- Filtrar por función: Coordinación, Referente, Sustitución e Integrante.
- Añadir varias personas en una misma operación.
- Cambiar funciones sin quitar y volver a agregar a la persona.
- Alertar antes de dejar un equipo sin Coordinación o Referente.
- Detectar cuentas sin equipo cuando su perfil requiere uno.

Criterio de aceptación: una administradora puede resolver altas, bajas y cambios de función desde Accesos o desde el equipo, con el mismo resultado y el mismo lenguaje.

### 6.2 Resumen de responsabilidades

- En cada integrante, mostrar tareas activas, proyectos, próximos seguimientos y carga estimada.
- Advertir si una persona concentra demasiado trabajo o si un proyecto no tiene responsable.
- Permitir abrir la bandeja de trabajo de esa persona sin perder el equipo actual.

Criterio de aceptación: antes de asignar trabajo, se puede ver si la persona tiene capacidad y qué responsabilidades activas mantiene.

### 6.3 Roles explicados

- Incluir descripciones cortas en el selector de perfil y función.
- Mostrar una vista previa de lo que la persona podrá ver y modificar.
- Separar claramente perfil de acceso institucional y función dentro de un equipo.
- Incluir ejemplos concretos para Administración, Coordinación e Integrante.

Criterio de aceptación: una administradora puede explicar por qué eligió un perfil y una función sin consultar documentación externa.

## 7. P1, proyectos, actividades y tareas

### 7.1 Jerarquía visible

- Representar la relación `Equipo > Proyecto > Actividad > Tarea`.
- Usar migas de navegación y títulos que indiquen el contexto actual.
- Mostrar tareas y actividades agrupadas dentro del proyecto.
- Evitar que proyecto y tarea parezcan elementos equivalentes.

Criterio de aceptación: una persona puede responder dónde pertenece una tarea mirando la pantalla, sin abrir un editor.

### 7.2 Plantillas para proyectos frecuentes

- Crear una plantilla `Proyecto de atención continua`.
- Crear una plantilla `Grupo de apoyo`.
- Crear una plantilla `Taller o actividad con certificados`.
- Permitir guardar un proyecto existente como plantilla.
- Cada plantilla puede sugerir hitos, tareas, checklist, equipo y tipo de seguimiento.

Criterio de aceptación: proyectos similares pueden crearse con estructura consistente sin copiar manualmente cada tarea.

### 7.3 Propuesta inicial para Familias

No cargar datos reales sin confirmación. Preparar un asistente que proponga:

- Familias en Red.
- Grupos de Apoyo Virtual.
- Atención a Familias por WhatsApp.
- Estimulación Motriz a través de la Plástica.

Para cada proyecto solicitar: objetivo, coordinación, integrantes, fecha de inicio, estado, frecuencia, actividades relacionadas y criterio de finalización.

Criterio de aceptación: la organización puede revisar y confirmar cada proyecto antes de incorporarlo al entorno vivo.

### 7.4 Vista operativa del proyecto

- Resumen de objetivo, responsable, equipo, estado y próxima fecha.
- Actividades, tareas, riesgos, documentos y decisiones en pestañas o secciones plegables.
- Progreso explicado mediante hitos completados y pendientes, no solo un porcentaje ambiguo.
- Acción `Qué necesita atención` para responsables, bloqueos y vencimientos.

Criterio de aceptación: la coordinación puede entender el estado del proyecto y tomar una acción sin recorrer varias páginas.

## 8. P1, enlaces y recursos

### 8.1 Recursos enlazados

- Añadir a tareas, actividades y proyectos un bloque `Recursos`.
- Cada recurso debe tener título, URL, tipo y nota opcional.
- Reconocer servicios comunes como Canva, Google Drive y sitios web, sin depender de ellos.
- Validar la URL antes de guardar.
- Abrir enlaces externos en una pestaña nueva con aviso visual.
- Permitir copiar el enlace desde un botón accesible.

Criterio de aceptación: la tarea de certificados puede incluir un recurso titulado `Certificados en Canva` que se abre directamente.

### 8.2 Enlaces detectados en descripciones

- Detectar URLs ya guardadas como texto.
- Convertirlas visualmente en enlaces accionables sin cambiar el texto original.
- Ofrecer `Mover a Recursos` para ordenar contenido existente.
- Bloquear protocolos inseguros y mostrar el dominio antes de abrir.

Criterio de aceptación: los enlaces históricos pueden usarse y migrarse sin reescribir las tareas.

### 8.3 Adjuntos reales

Esta fase requiere una decisión institucional antes de implementarse.

- Definir formatos permitidos: PDF, imagen, documento y planilla.
- Definir tamaño máximo y cuota por organización.
- Definir almacenamiento, respaldo, retención y eliminación.
- Respetar restricciones de datos personales y fichas protegidas.
- Analizar archivos en busca de contenido malicioso.
- Registrar quién subió, descargó o eliminó un archivo.
- Mostrar progreso, error recuperable y reintento durante la carga.

Criterio de aceptación: un archivo puede adjuntarse, descargarse y eliminarse con permisos correctos, auditoría y recuperación ante fallos.

## 9. P2, notificaciones y seguimiento

### 9.1 Centro de notificaciones interno

- Bandeja con nuevas, leídas, archivadas y pospuestas.
- Contador visible y accesible.
- Acciones directas: abrir tarea, marcar como leída y posponer.
- Agrupar avisos repetidos del mismo elemento.
- Incluir contexto: quién asignó, equipo, proyecto y fecha.
- Mantener el destino exacto al abrir una notificación.

Criterio de aceptación: una persona puede identificar nuevas asignaciones y llegar a la tarea correcta con un toque.

### 9.2 Preferencias personales

- Elegir qué eventos generan aviso: asignación, fecha próxima, comentario, bloqueo o cambio de responsable.
- Elegir frecuencia de recordatorios.
- Definir horario silencioso.
- Permitir un resumen diario o semanal.
- Ofrecer valores predeterminados razonables para evitar configuración obligatoria.

Criterio de aceptación: cada persona controla la cantidad de avisos sin perder asignaciones importantes.

### 9.3 Notificaciones del navegador o teléfono

- Tratar esta función como opcional y pedir consentimiento explícito.
- Explicar qué dispositivos y navegadores son compatibles.
- Permitir probar el aviso durante la configuración.
- Mantener la bandeja interna como fuente confiable si el aviso externo falla.
- No revelar información sensible en la pantalla bloqueada.
- Registrar entrega, fallo y apertura sin rastreo innecesario.

Criterio de aceptación: una persona que activó avisos recibe una notificación útil, puede abrir el destino correcto y puede desactivarla fácilmente.

### 9.4 Correo electrónico, fase opcional

- Requiere proveedor, dominio remitente, consentimiento, política de rebotes y costos aprobados.
- Enviar resúmenes, no un correo por cada cambio menor.
- Incluir enlaces que lleven al elemento correcto después de iniciar sesión.
- Nunca incluir datos protegidos en el asunto.

Criterio de aceptación: los correos son útiles, configurables y no duplican innecesariamente los avisos internos.

## 10. P2, ayuda y adopción

### 10.1 Ayuda contextual

- Añadir `¿Cómo funciona?` en equipos, proyectos, tareas, accesos y notificaciones.
- Abrir la respuesta correspondiente sin sacar a la persona del formulario.
- Ofrecer un vínculo a la guía completa.
- Registrar búsquedas sin resultado para priorizar nuevas respuestas, sin guardar datos sensibles.

Criterio de aceptación: las cuatro preguntas de los audios pueden resolverse desde la pantalla donde aparecen.

### 10.2 Recorridos guiados

- Primer acceso de Administración: crear equipo, acceso e integrante.
- Primer acceso de Coordinación: revisar equipo, crear proyecto y asignar tarea.
- Primer acceso de Integrante: encontrar tarea, abrir recurso y actualizar estado.
- Permitir omitir, retomar y reiniciar la guía.

Criterio de aceptación: una persona nueva completa su primer recorrido sin instrucciones por WhatsApp.

### 10.3 Vocabulario institucional

- Definir un glosario para equipo, proyecto, actividad, tarea, responsable, seguimiento y recurso.
- Usar las mismas palabras en botones, títulos, ayudas y notificaciones.
- Evitar términos técnicos como CMS, endpoint, push o payload en la interfaz.

Criterio de aceptación: cada concepto tiene un nombre único y una explicación breve en todo el sistema.

## 11. P2, experiencia celular

- Acciones principales fijas en la parte inferior cuando sea útil.
- Formularios en una sola columna con secciones plegables.
- Selectores con objetivos táctiles amplios y etiquetas que no se corten.
- Borradores automáticos ante cierre accidental o pérdida de conexión.
- Confirmaciones que no dependan de mensajes pequeños fuera de pantalla.
- Enlaces y archivos con botones de ancho completo.
- Bandeja de notificaciones optimizada para lectura y acción con una mano.
- Menú Más compacto, cerrable al tocar fuera y con secciones agrupadas.

Criterio de aceptación: los cuatro recorridos principales se completan en un teléfono de 375 píxeles sin desplazamiento horizontal ni pérdida de datos.

## 12. P3, gobierno y calidad institucional

### 12.1 Registro institucional

- Auditar altas y bajas de integrantes.
- Auditar cambios de perfil, función y responsable.
- Auditar creación y modificación de recursos.
- Enlazar cada registro al elemento afectado.
- Ofrecer filtros por persona, equipo, acción y período.

### 12.2 Salud del sistema

- Detectar equipos sin coordinación.
- Detectar proyectos sin responsable o sin próximo paso.
- Detectar tareas vencidas, bloqueadas o sin contexto.
- Detectar accesos activos de personas sin equipos.
- Mostrar recomendaciones accionables, no solo métricas.

### 12.3 Accesibilidad

- Navegación completa con teclado.
- Etiquetas accesibles en iconos y botones.
- Contraste suficiente y foco visible.
- Mensajes comprensibles para lectores de pantalla.
- Respeto por reducción de movimiento.
- Validación con zoom y tamaño de texto aumentado.

## 13. Datos y arquitectura previstos

### Recursos

- Identificador.
- Tipo de elemento relacionado y su identificador.
- Título, URL, tipo y nota.
- Persona creadora y fechas de creación y modificación.
- Estado activo o eliminado.

### Preferencias de notificación

- Persona.
- Canal habilitado.
- Eventos elegidos.
- Frecuencia y horario silencioso.
- Consentimiento y fecha de actualización.

### Entregas de notificación

- Evento de origen.
- Persona destinataria.
- Canal, estado, intentos y fecha.
- Destino interno seguro.
- Error técnico sin contenido sensible.

### Plantillas

- Nombre, descripción y equipo propietario.
- Estructura sugerida de hitos, tareas y checklist.
- Versión, estado y persona autora.

## 14. Dependencias y decisiones necesarias

- Confirmar quién puede crear equipos y proyectos.
- Confirmar si Coordinación puede administrar integrantes o solo Administración.
- Elegir si los enlaces deben ser visibles para todo el equipo o solo para personas asignadas.
- Decidir si se necesitan archivos reales o si enlaces externos cubren el uso inmediato.
- Definir canal de notificación preferido antes de contratar o integrar un proveedor.
- Definir reglas de datos personales para nombres, fotos, documentos y contenido de notificaciones.
- Confirmar nombres, responsables y fechas antes de poblar proyectos reales.

## 15. Riesgos y mitigaciones

- Exceso de avisos: agrupar, resumir y ofrecer preferencias.
- Permisos confusos: vista previa de alcance y lenguaje cotidiano.
- Archivos sensibles: empezar con enlaces y diseñar gobernanza antes de subir archivos.
- Formularios largos: progresión, valores sugeridos y guardado de borrador.
- Duplicación de proyectos: búsqueda previa y plantillas.
- Acciones sin destino: pruebas automatizadas para cada vínculo y alerta.
- Diferencias entre celular y escritorio: pruebas funcionales en ambos tamaños después de cada fase.

## 16. Secuencia de ejecución recomendada

### Entrega 1, QOL inmediata

- Estados vacíos accionables.
- Acciones rápidas por equipo.
- Contexto preseleccionado.
- Confirmaciones con próximos pasos.
- Ayuda contextual.

### Entrega 2, estructura de trabajo

- Jerarquía visible.
- Vista operativa de proyectos.
- Plantillas.
- Asistente para proyectos de Familias.

### Entrega 3, recursos

- Enlaces dedicados.
- Detección de enlaces existentes.
- Auditoría de recursos.
- Decisión sobre adjuntos reales.

### Entrega 4, avisos internos

- Centro de notificaciones.
- Contadores y estados.
- Preferencias personales.
- Destinos correctos.

### Entrega 5, canales externos

- Prueba de notificaciones del navegador o teléfono.
- Evaluación de correo.
- Consentimiento, privacidad y observabilidad.

### Entrega 6, adopción y gobierno

- Recorridos guiados.
- Glosario institucional.
- Indicadores de salud.
- Auditoría y accesibilidad final.

## 17. Auditoría requerida después de cada entrega

- Pruebas unitarias de reglas y permisos.
- Pruebas de integración de API y almacenamiento.
- Pruebas de interfaz para recorridos completos.
- Verificación visual en escritorio y celular.
- Prueba con teclado y lector de pantalla en controles nuevos.
- Verificación de que no se expongan datos protegidos.
- Revisión de Registro institucional.
- Prueba de conexión lenta, error y reintento.
- Confirmación de que los destinos de botones y notificaciones sean correctos.
- Publicación únicamente con autorización explícita y verificación del dominio canónico.

## 18. Prueba de aceptación con la persona de los audios

La sesión de validación debe pedirle que complete, sin indicaciones previas:

1. Agregar una compañera a Familias y asignarle una función.
2. Crear `Familias en Red` como proyecto de Familias.
3. Crear una tarea vinculada al proyecto y asignarla a una persona.
4. Agregar un enlace de Canva titulado `Certificados del taller`.
5. Explicar dónde verá la persona asignada la notificación.
6. Encontrar la respuesta en Ayuda si olvida uno de los pasos.

Registrar tiempo, errores, retrocesos, preguntas y términos que no entienda. La entrega se acepta cuando puede completar los seis puntos sin ayuda externa y entiende qué avisos recibirá realmente.

## 19. Métricas de éxito

- Porcentaje de equipos con coordinación e integrantes definidos.
- Tiempo medio para agregar una persona a un equipo.
- Tiempo medio para crear un proyecto y su primera tarea.
- Porcentaje de tareas con responsable, fecha, contexto y recurso cuando corresponde.
- Porcentaje de notificaciones abiertas que llegan al destino correcto.
- Búsquedas de Ayuda sin resultado.
- Formularios abandonados o recuperados desde borrador.
- Cantidad de consultas externas sobre funciones ya documentadas.

## 20. Definición global de terminado

- Los cuatro problemas expresados en los audios tienen una solución visible y comprobada.
- Los flujos funcionan en escritorio y celular.
- Los perfiles y permisos se respetan en interfaz y servidor.
- Los mensajes describen correctamente el comportamiento real.
- Los recursos y notificaciones conservan trazabilidad.
- La persona solicitante supera la prueba de aceptación.
- Las pruebas, la auditoría visual y la revisión de privacidad pasan antes de publicar.
