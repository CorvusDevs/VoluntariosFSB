# Brief: segunda fase del overhaul del editor de página web

- Resultado: completar los cinco pendientes visuales y operativos del editor sin romper borradores ni publicación.
- Alcance: mapa Aletea, selección contextual, edición directa ampliada, encuadre de imágenes y revisión accionable.
- Archivos: editor, modelo si hiciera falta, estilos, ayuda, novedades, pruebas y documentación relacionada.
- Imágenes: conservar WebP adaptativo y agregar encuadre sin transmitir el original.
- Compatibilidad: preservar JSON, permisos, API, medios existentes y edición desde teclado.
- Exclusiones: no desplegar, no modificar la web pública antigua y no cambiar contratos externos.
- Autoridad: cambios locales, fixtures, pruebas y vista previa; cualquier publicación requiere otra solicitud explícita.
- Evidencia: pruebas nuevas y completas, diff limpio, auditoría textual y revisión visual a 320, 390 y escritorio.
- Stop: los cinco pendientes quedan demostrables, accesibles y sin regresiones abiertas.
- Esfuerzo: alto, por interacción visual, estado compartido y compatibilidad.

## Cierre verificado

- Mapa visual: 21 secciones navegables sobre el símbolo de infinito, con destino actual y estado visibles.
- Inspector contextual: textos, imágenes, botones y tarjetas muestran solamente los controles relacionados.
- Edición directa: las colecciones se ordenan y cambian de visibilidad desde la maqueta.
- Imágenes: la optimización WebP se conserva y el punto focal se ajusta sin volver a cargar el archivo.
- Calidad: cada problema detectado abre la sección que necesita corrección.
- Ayuda y novedades: versión 1.9.4 documentada.
- Verificación: 1.194 pruebas completas aprobadas, 75 pruebas enfocadas aprobadas, sin desbordamiento a 320, 390 ni escritorio y sin errores de consola.
- Publicación: no realizada, fuera de la autoridad de esta tarea.
