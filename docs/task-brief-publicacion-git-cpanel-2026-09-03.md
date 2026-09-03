Outcome: Validar un despliegue Git administrado por cPanel sin modificar producción.
Scope: VoluntariosFSB, Aletea Web, receta .cpanel.yml y prueba aislada en .aletea-deploy.
Excluded: Datos, secretos, .htaccess, node_modules, base de datos y activación automática en producción.
Authority: Editar, probar y publicar la configuración Git necesaria; configurar cPanel según la autorización actual.
Evidence: Repositorio limpio de despliegue, tarea cPanel exitosa, marcador remoto exacto y comparación de tiempos con SFTP.
Stop condition: Detener ante árbol sucio remoto, rutas no aisladas, falta de rollback o cualquier acceso a secretos.
Tool route: Inspección local, pruebas, auditoría Git, push explícito y registro cPanel mediante interfaz admitida.
Model effort: Alto, por afectar infraestructura de publicación.
Risks: Mezclar fuente con producción, incluir archivos privados o desplegar un commit no aprobado.
First checkpoint: Confirmar arquitectura y estado de ambos repositorios antes de escribir la receta.
