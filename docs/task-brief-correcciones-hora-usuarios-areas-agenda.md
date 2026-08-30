Outcome: Publicar en gestor.aletea.org las correcciones de horarios, Agenda, Áreas y presentación de usuarios.
Scope: VoluntariosFSB, interfaz y API del CMS, pruebas, paquete dist y aplicación Passenger en cPanel.
Excluded: Modificar aletea.org, Cloudflare, credenciales o datos institucionales salvo una verificación no destructiva.
Authority: Auditar, corregir, construir, subir al CMS de producción y reiniciar Passenger. No publicar Git ni reescribir historial.
Evidence: Suite completa, build, revisión de secretos, diff check, auditoría tipográfica, archivos vivos y respuestas HTTP verificadas.
Stop condition: gestor.aletea.org sirve la nueva versión y las cuatro correcciones están presentes sin errores HTTP.
Tool route: rg, Vitest, build estático, paquete cPanel, navegador autenticado y verificación HTTP independiente.
Model effort: medio.
Risks: Estado Git con trabajo previo, caché del navegador, reemplazo parcial de dist o reinicio fallido de Passenger.
First checkpoint: Confirmar el contenido exacto del artefacto y el mecanismo de despliegue antes de escribir en cPanel.
