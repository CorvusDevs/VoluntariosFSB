Outcome: La versión local actual queda publicada y verificada en gestor.aletea.org y prueba.aletea.org.
Scope: Build estático, aplicación Passenger de cPanel, esquema MariaDB no destructivo y sitio público de prueba.
Excluded: aletea.org, WordPress, DNS, Cloudflare, Git remoto, eliminación o reemplazo de datos institucionales.
Authority: Construir, subir los archivos necesarios, aplicar migraciones aditivas y reiniciar Passenger en los dos destinos autorizados.
Evidence: Suite completa, build, auditorías, manifiesto del paquete, HTTP en vivo, versión y archivos clave coincidentes.
Stop condition: Ambos subdominios sirven el contenido actual sin errores, o queda documentado un bloqueo externo exacto.
Tool route: Shell local, procedimiento de cPanel existente, sesión autenticada y comprobaciones web independientes.
Model effort: Alto por publicación dual, datos existentes y riesgo de caché.
Risks: Carga parcial, caché antigua, migración omitida, mezclar archivos privados del gestor con la web pública.
First checkpoint: Confirmar el contenido exacto y el mecanismo de carga de cada destino antes de modificar el servidor.
