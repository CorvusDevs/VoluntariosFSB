Outcome: publicar permisos de datos personales fáciles de entender, con vigencia hasta una fecha o sin vencimiento explícito.
Scope: interfaz de Accesos, contrato de autorización de la API, migración aditiva 0050, ayuda, cambios, versión, pruebas, paquete cPanel y publicación del gestor.
Excluded: otorgar permisos a usuarios reales, cambiar integrantes de equipos, modificar contraseñas, publicar la web pública o publicar el código fuente.
Authority: se permiten ediciones locales, auditoría, empaquetado, aplicación de la migración aditiva, reinicio de Passenger y publicación en gestor.aletea.org solicitada en este turno.
Evidence: pruebas completas, columna nueva con valor predeterminado 0, auditoría de secretos y recursos, versión y archivos servidos, API sana y acceso no autenticado rechazado.
Stop condition: producción contiene la columna nueva, la interfaz publicada explica niveles y duración, la API responde y ningún acceso antiguo se amplía automáticamente.
Tool route: inspección local, apply_patch, Vitest, paquete con lista permitida, phpMyAdmin o cPanel autenticado y verificación HTTP del documento raíz real.
Model effort: alto por permisos, privacidad, migración y despliegue.
Risks: desplegar código antes de la columna, convertir datos nulos antiguos en permisos indefinidos, incluir archivos sensibles o verificar una carpeta distinta de la servida.
First checkpoint: validar que la migración solo agrega una columna con valor predeterminado 0 y que el servidor exige una elección explícita para el acceso indefinido.
