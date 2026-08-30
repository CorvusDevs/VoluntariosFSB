# Auditoría integral del gestor institucional

Fecha de auditoría: 19 de agosto de 2026

## Alcance revisado

- 14 secciones del gestor con datos de prueba realistas.
- Formularios internos y públicos, validación del servidor y persistencia en D1.
- Tareas, proyectos, reuniones, decisiones, eventos, formularios, entradas, documentos, programas, alianzas y responsabilidades.
- Roles, alcance por equipo, documentos restringidos y fichas personales protegidas.
- Navegación de escritorio y una auditoría real de las 14 secciones en una ventana móvil de 390 por 844 px.
- Estructura responsive, controles con nombre accesible, objetivos táctiles y formularios extensos.
- Las 37 migraciones se aplicaron desde cero en SQLite y terminaron con integridad correcta.

## Correcciones aplicadas

1. Las propuestas ahora conservan objetivo, pasos, recursos y personas necesarias antes de validarse y guardarse.
2. El día institucional se calcula según America/Montevideo. Agenda, vencimientos, alertas y permisos temporales ya no adelantan un día después de las 21:00 de Uruguay.
3. Equipos solicitantes y cuentas relacionadas se validan antes de escribir. Una referencia inactiva muestra un error comprensible en vez de terminar como un fallo interno de D1.
4. Una revisión semanal solo acepta una fecha real que sea lunes.
5. Un gasto sin monto ya no se convierte silenciosamente en cero.
6. La agenda identifica cada control con una etiqueta visible y mantiene alturas consistentes.
7. El formulario público limita los textos al mismo tamaño que acepta el servidor y tiene una prueba completa de envío de propuestas.
8. Los formularios largos usan el alto disponible y mantienen Cancelar y Guardar visibles mientras solo se desplaza el contenido.
9. Los botones de entradas, formularios, propuestas y comunicados validan todos los campos obligatorios antes de enviar datos.
10. Un error de guardado conserva el formulario y lo escrito, muestra el problema dentro del panel y deja el botón disponible para reintentar.
11. La API ya no acepta tareas recurrentes sin próxima fecha ni gastos sin fecha. Los enlaces, títulos y datos de contacto muestran los mismos límites que aplica el servidor.
12. En celular, migas de navegación, filtros y enlaces de documentos ahora alcanzan un objetivo táctil mínimo de 44 px. Las 14 secciones quedaron sin desborde horizontal, controles sin nombre ni objetivos visibles menores a ese tamaño.
13. Los flujos que derivan una entrada, convierten una decisión en tarea o preparan una entrada en agenda guardan sus registros relacionados en un único lote atómico. Si una escritura falla, D1 no deja la tarea, entrada, decisión o evento a medias.

## Estados de interfaz verificados

- Carga inicial con indicador accesible y `aria-busy`.
- Error de carga con explicación y acción Reintentar.
- Error de guardado dentro del formulario, sin borrar datos ingresados.
- Éxito de guardado con confirmación global y recarga de los datos persistidos.
- Estados vacíos con una explicación específica por sección y, cuando corresponde, una próxima acción.
- Captura rápida y formulario de tarea en una ventana móvil de 390 por 844 px, sin desborde horizontal y con acciones visibles. El panel usa 370 px de ancho y 824 px de alto disponible.

## Fortalezas actuales

- Flujo trazable desde una entrada o formulario hasta una tarea con responsable y seguimiento.
- Alcance por equipo y perfiles diferenciados para Administración, Dirección, Coordinación, Integrante y Consulta.
- Separación entre datos operativos y datos personales protegidos.
- Proyectos con riesgos, hitos, gastos, documentos y contexto relacionado.
- Reuniones con preparación, minuta, decisiones y conversión de acuerdos en tareas.
- Formularios públicos separados de los perfiles internos, con límite de frecuencia y campo trampa.
- Registro institucional de actividad y documentos con niveles de visibilidad.
- Tareas recurrentes, checklists, alertas, agenda y detección de conflictos.

## Brechas recomendadas

### Prioridad alta

1. Capacidad y carga de trabajo. Agregar disponibilidad semanal por persona, carga asignada y alerta de sobrecarga. Asana ofrece esta lectura en Workload y la vincula con proyectos y portafolios.
2. Formularios configurables. Permitir campos personalizados, obligatoriedad, ayudas y condiciones según respuesta. Hoy cada tipo tiene una estructura fija.
3. Métricas operativas. Medir tiempo hasta asignación, tiempo hasta cierre, tareas vencidas por equipo, trabajo bloqueado y cumplimiento de seguimientos.
4. Protección del ingreso. Agregar limitación de intentos por usuario y dirección, espera progresiva y registro de intentos fallidos sin guardar contraseñas.
5. Respaldo y recuperación. Automatizar exportaciones cifradas de D1, probar restauración y documentar el objetivo de recuperación.
6. Idempotencia de automatizaciones. Endurecer la generación recurrente y el registro de auditoría para que un corte posterior a la escritura principal nunca produzca un reintento ambiguo.

### Prioridad media

7. Vistas alternativas. Incorporar tablero Kanban y cronograma para tareas y proyectos, conservando los filtros actuales.
8. Reglas automáticas. Permitir reglas simples como: si una tarea vence sin responsable, avisar a Coordinación; si se completa un hito, crear el siguiente; si una solicitud queda sin respuesta, escalar.
9. Historial por registro. Mostrar los cambios de una tarea o proyecto dentro de su contexto y permitir comparar versiones. El registro general actual da trazabilidad, pero obliga a buscar fuera del elemento.
10. Integración de agenda. Ofrecer exportación ICS y, luego, sincronización con calendarios institucionales.
11. Exportaciones de gestión. Descargar tareas, proyectos, gastos, decisiones y auditoría en CSV con filtros y permisos.

### Prioridad posterior

12. Plantillas completas de proyecto, no solo checklists de tareas.
13. Comentarios con menciones y suscripciones por elemento.
14. Detección asistida de duplicados en proyectos, tareas, personas y formularios.
15. Paneles guardados por rol o equipo, con indicadores seleccionables.
16. Centro de integraciones con webhooks auditables para correo, Drive y otros servicios.

## Comparación de referencia

- Notion combina proyectos y tareas relacionados con vistas de tabla, tablero, cronograma, calendario y filtros, además de permisos granulares y automatizaciones de bases.
- Asana agrega portafolios, salud transversal y capacidad de personas mediante Workload.
- Airtable separa interfaces de la base, permite formularios configurables y aplica permisos a tablas, campos e interfaces.
- monday.com combina permisos por tablero y panel con formularios y tableros de indicadores.

La mejor siguiente fase para Aletea no es copiar toda esa amplitud. Conviene implementar primero capacidad de trabajo, métricas operativas, formularios configurables, protección del ingreso y respaldo verificable. Esas cinco brechas mejoran decisiones, seguridad y continuidad sin convertir el sistema en una herramienta genérica difícil de usar.

## Seguimiento de las cinco mejoras prioritarias

Las cinco recomendaciones se implementaron y se auditaron por separado el 19 de agosto de 2026.

1. Capacidad y carga de trabajo: disponibilidad semanal, esfuerzo estimado, carga asignada, tareas sin estimación y señal de sobrecarga. Resultado: 105 pruebas específicas y auditoría visual responsive aprobadas.
2. Formularios configurables: texto breve, texto largo, listas, casillas y fechas, con obligatoriedad, ayudas y condiciones basadas en respuestas anteriores. Resultado: 107 pruebas específicas, persistencia y editor responsive aprobados.
3. Métricas operativas: tiempo medio hasta asignación y cierre, atrasos con denominador, bloqueos y seguimientos vencidos. Resultado: 121 pruebas específicas, dos disparadores de asignación y visualización responsive aprobados.
4. Protección del ingreso: límites independientes por usuario y dirección, esperas progresivas, claves SHA-256 y derivación de contraseña uniforme para cuentas existentes o inexistentes. Resultado: 65 pruebas específicas y bloqueo de endpoint verificado.
5. Respaldo y recuperación: exportación remota con confirmación explícita, cifrado AES-256-GCM con scrypt, manifiesto SHA-256, restauración temporal, integridad, claves foráneas y procedimiento de recuperación sin escritura automática. Resultado: dos ensayos completos, copia válida restaurada, frase incorrecta rechazada y copia alterada rechazada.

La auditoría final ejecutó 914 pruebas correctas, mantuvo 20 pruebas omitidas ya documentadas, construyó el paquete de Cloudflare, aplicó las 41 migraciones desde cero y revisó 16 rutas móviles a 390 por 844 px. No hubo desborde horizontal, controles visibles sin nombre ni objetivos táctiles aislados menores a 44 px.
