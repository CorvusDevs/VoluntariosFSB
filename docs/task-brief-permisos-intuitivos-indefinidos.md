Outcome: En Accesos, la duración de datos personales se elige como sin acceso, temporal o indefinida, con un resumen claro de lo que habilita.
Scope: UI de Accesos, contrato API, validación de vigencia, ayuda y pruebas relacionadas.
Excluded: Cambiar permisos reales de usuarios, publicar en cPanel, modificar contraseñas o equipos.
Authority: Ediciones locales y pruebas. Cualquier cambio en producción requiere una solicitud posterior.
Evidence: Pruebas unitarias e integración, revisión visual de escritorio y teléfono, diff sin errores.
Stop condition: El acceso indefinido funciona sin fecha, el temporal exige fecha y los estados se entienden sin conocer la implementación.
Tool route: Inspección dirigida, apply_patch, pruebas focalizadas, suite completa y vista previa local.
Model effort: Terra medium.
Risks: No conceder acceso por omisión y conservar compatibilidad con cuentas temporales existentes.
First checkpoint: Identificar todos los consumidores de nivel_datos_personales y datos_personales_hasta.
