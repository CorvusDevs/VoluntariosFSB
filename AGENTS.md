# Instrucciones del proyecto

## Publicación del gestor

- Leer `docs/workflow-publicacion.md` antes de preparar o publicar un build.
- Ejecutar `npm run preparar:publicacion` y auditar el `dist/` resultante. No armar paquetes manualmente.
- No declarar una publicación terminada por el estado del cargador de cPanel. Verificar el artefacto vivo, las rutas, la API y los archivos protegidos.
- Preservar el `.htaccess` administrado por el servidor. Nunca incluirlo en `dist/` ni reemplazarlo durante una carga.
- Detener la auditoría funcional si el sello visible no coincide con `version.json` o si JavaScript, CSS y service worker no pertenecen al mismo build.
- Probar una sesión limpia y la recuperación desde un service worker anterior antes de publicar cambios del shell, cache, rutas o arranque.
- No subir secretos, migraciones, código de servidor, `node_modules`, registros ni archivos de entorno dentro del paquete público.

## Evidencia de cierre

- Informar el sello exacto del build.
- Informar el resultado de `npm run auditar:publicacion` y `npm test`.
- Después de publicar, comparar las huellas del build local con las respuestas vivas y probar `/`, `/tareas`, `/formularios`, `/api/health` y los archivos protegidos.
- Si una sesión sigue mostrando otro sello, la publicación no está validada aunque el servidor tenga los archivos nuevos.
