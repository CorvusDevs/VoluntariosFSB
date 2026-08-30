Outcome: Completar una tarea permite dejar una nota opcional y elimina el aviso de asignacion obsoleto sin ocultar avisos reales.
Scope: API y UI de tareas, contador de avisos, ayuda/cambios, pruebas y paquete cPanel de gestor.aletea.org.
Excluded: Cambiar tareas o notificaciones reales manualmente, publicar la pagina publica o hacer push a Git.
Authority: Editar, probar, auditar, empaquetar y publicar gestor.aletea.org en este turno.
Evidence: Pruebas de API y UI cubren cierre con y sin nota, aviso resuelto, contador actualizado y texto accesible.
Stop condition: El artefacto local pasa pruebas, el sitio activo sirve la version nueva y las rutas principales responden sin error.
Tool route: apply_patch, Vitest, auditorias, sellado, paquete cPanel, navegador autenticado y verificacion HTTP.
Model effort: Terra medium.
Risks: Resolver un aviso no relacionado, volver obligatorio el comentario o pisar cambios locales existentes.
First checkpoint: Conservar el flujo rapido y limitar la limpieza a notificaciones de la misma tarea y usuario.
