# Auditoría de Ayuda, versión 1.6.6

## Hallazgos

- La portada mostraba 59 preguntas juntas y alcanzaba 5.780 px de alto en una pantalla de 1280 por 720.
- Las 11 categorías ocupaban 1.692 px dentro de un espacio de 1.043 px, por lo que varios temas quedaban fuera de vista.
- Las tarjetas usaban variables de color inexistentes y perdían borde y fondo.
- La búsqueda dependía del orden exacto de las palabras.
- Finanzas no explicaba cómo editar una cuenta ni cómo exportar el control mensual.
- Una respuesta describía la arquitectura genérica de permisos, pero no indicaba a una persona qué hacer.

## Cambios aplicados

- La portada abre con seis respuestas destacadas y cuatro atajos por tarea.
- El índice lateral muestra todos los temas y sus cantidades. En teléfono se convierte en un selector.
- La búsqueda acepta varias palabras en cualquier orden, puede limpiarse con Escape y abre una respuesta única automáticamente.
- Solo una respuesta permanece abierta para evitar recorridos excesivamente largos.
- Cada respuesta muestra el tema y la versión de origen.
- Se agregó orientación sobre edición de cuentas, recargos, exportación mensual y solicitud de accesos.
- Se eliminó la pregunta técnica que presentaba el recorrido de permisos como una implementación especial de Finanzas.
- Se corrigieron colores, bordes, fondos, focos y objetivos táctiles.

## Cobertura resultante

La guía contiene 60 respuestas en 10 temas: Accesos, Uso del sistema, Finanzas, Comunicación visual, Página web, Asistencia, Equipos, Proyectos y tareas, Notificaciones y Materiales y enlaces.

Las actualizaciones recientes de permisos, rutas compartibles, Finanzas, fotografías optimizadas, Carta membretada, League Gothic y publicación de contenido tienen una respuesta localizable.

## Verificación visual

- Escritorio: la portada inicial bajó de 5.780 px a 1.263 px.
- Teléfono de 390 por 844: ancho de contenido de 375 px, sin desborde horizontal.
- Ningún control visible queda por debajo de 44 por 44 px.
- Las categorías ya no dependen de desplazamiento horizontal oculto.
