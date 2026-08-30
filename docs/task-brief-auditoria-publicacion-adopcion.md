Outcome: Auditar las mejoras de avisos y adopción, corregir cualquier error y publicar un paquete verificable en aletea.pages.dev.
Scope: VoluntariosFSB, cambios locales actuales, API CMS, interfaz, pruebas, paquete dist y Cloudflare Pages al proyecto aletea.
Excluded: GitHub, proveedores externos de mensajes, cambios de producto nuevos y escrituras D1 si no hay migraciones pendientes.
Authority: Corregir archivos locales, construir, desplegar a Cloudflare Pages y verificar la producción. No reescribir historial Git.
Evidence: Estado Git preservado, suite completa, build, diff check, auditoría de guiones, contenido seguro de dist, proyecto Cloudflare confirmado, despliegue Production y versión idéntica local/remota.
Stop condition: Detener ante pruebas fallidas, secretos o archivos privados en dist, proyecto remoto distinto de aletea, migraciones pendientes inesperadas o rechazo del despliegue.
Model effort: Alto por combinar auditoría funcional, seguridad del artefacto y validación de producción.
