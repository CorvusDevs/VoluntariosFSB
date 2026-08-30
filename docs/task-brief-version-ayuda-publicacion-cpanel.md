Outcome: Publicar en gestor.aletea.org la navegación corregida y todas las mejoras locales con versión, cambios y ayuda actualizados.
Scope: VoluntariosFSB, versión visible, novedades 1.3.0, FAQ, paquete dist y archivos de la aplicación Passenger en cPanel.
Excluded: Modificar aletea.org, prueba.aletea.org, Cloudflare, datos institucionales, esquema MariaDB o Git remoto.
Authority: Editar, probar, construir, subir a gestor.aletea.org y reiniciar Passenger. No borrar datos ni publicar Git.
Evidence: Suite completa, build, auditorías, versión coherente en tres superficies, archivos vivos, HTTP correcto y navegación comprobada.
Stop condition: La versión nueva aparece en gestor.aletea.org y el menú, Cambios y FAQ coinciden con el artefacto local.
Tool route: rg, Vitest, build estático, paquete de publicación, cPanel autenticado y comprobación web independiente.
Model effort: medio.
Risks: Estado Git con trabajo previo, carga parcial, caché del trabajador de servicio y reinicio fallido de Passenger.
First checkpoint: Actualizar solo afirmaciones comprobadas y revisar el contenido exacto del paquete antes de subirlo.
