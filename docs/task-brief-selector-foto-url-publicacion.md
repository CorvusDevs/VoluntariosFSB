Outcome: El editor de Comunicación visual permite elegir una foto con controles en español o cargar una imagen pública por URL, incluidos enlaces públicos compatibles de Google Drive, y la versión auditada queda publicada en gestor.aletea.org.
Scope: Interfaz accesible, carga remota segura, validaciones, pruebas, versión, novedades, ayuda, paquete de producción y despliegue cPanel.
Excluded: Archivos privados de Drive, integración OAuth con Google, cambios en aletea.org y publicación de código fuente.
Authority: Editar y probar el repositorio local, crear el paquete y publicar en gestor.aletea.org. No hacer commit ni push.
Evidence: Pruebas completas, controles visuales local y móvil, auditoría de seguridad del paquete, hashes local y remoto, versión viva y respuesta del backend.
Stop condition: Detener si cPanel requiere credenciales, si la sesión expiró, o si no es posible validar la imagen remota sin ampliar permisos o exponer la red interna.
Tool route: Shell y apply_patch para código y pruebas; navegador para la vista local y cPanel; HTTP para contratos y comprobación viva.
Model effort: Alto.
Risks: SSRF, archivos demasiado grandes, formatos no admitidos, enlaces de Drive privados, caché del service worker y pérdida de borradores locales.
First checkpoint: Confirmar el contrato de los enlaces, implementar el selector y superar las pruebas específicas antes de tocar versión o producción.
