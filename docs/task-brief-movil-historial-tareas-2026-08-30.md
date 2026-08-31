Outcome: la página de prueba no superpone acciones ni tarjetas en celular, y quien asignó una tarea puede encontrarla y leer su cierre después de completada.
Scope: aletea-web móvil, bandeja e historial de tareas del gestor, API si el filtro actual omite cierres, pruebas y publicación SFTP a gestor.aletea.org y prueba.aletea.org.
Excluded: aletea.org de producción, GitHub Pages, rediseño de escritorio y cambios a tareas ajenas al flujo de cierre.
Authority: editar y probar ambos proyectos, publicar únicamente gestor y página de prueba mediante el flujo SFTP confirmado.
Evidence: mediciones DOM antes y después en anchos 320, 375 y 430, prueba de asignador y responsable, suites completas, sello único, hashes vivos y rutas verificadas dos veces.
Stop condition: no hay solapamientos móviles en los recorridos mostrados y una tarea cerrada aparece para quien la asignó con estado, fecha y comentario de cierre.
Tool route: estado activo y datos de tarea, medición Playwright, cambio mínimo, pruebas, simulación SFTP, publicación real y verificación limpia más actualización desde build anterior.
Model effort: high, porque combina datos reales, permisos, UI móvil, dos proyectos y publicación con restauración automática.
Risks: ocultar tareas por un filtro incorrecto, exponer cierres a personas sin relación, publicar capas desincronizadas o sobrescribir configuración del servidor.
First checkpoint: identificar el sello y la rama activa, medir los elementos que se superponen y reproducir el filtro de la tarea completada antes de editar.
