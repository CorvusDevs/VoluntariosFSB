Outcome: publicar gestor, base de datos y web de prueba con un solo comando SFTP verificable, sin usar el cargador manual de cPanel.
Scope: VoluntariosFSB, aletea-web, clave de despliegue, transferencia SFTP, migraciones MariaDB, Passenger y documentación operativa.
Excluded: producción aletea.org, cambios DNS, almacenar credenciales en Git y eliminar paquetes históricos sin una política de retención.
Authority: configurar en cPanel el acceso SSH autorizado, editar ambos proyectos, ejecutar pruebas y validar staging; no publicar producción aletea.org.
Evidence: puerto 2200 verificado, autenticación por clave, SFTP de ida y vuelta, prueba en seco, respaldo previo, migración idempotente, hashes vivos iguales, rutas sanas y restauración automática.
Stop condition: un comando prepara, transfiere, activa, reinicia y verifica ambos destinos mediante SFTP, sin depender de una terminal remota.
Tool route: premise receipt en cPanel, clave dedicada, SFTP por lista permitida, publicación staging y verificación HTTP doble.
Model effort: high, por involucrar producción, autenticación, Passenger, MariaDB y dos raíces públicas.
Risks: sobrescribir .htaccess, filtrar secretos, publicar una capa incompleta o dejar código y esquema desincronizados.
First checkpoint: completado. El puerto SSH 2200 acepta la clave, la terminal está deshabilitada por el proveedor y el subsistema SFTP permite escribir, renombrar, leer y retirar archivos.
