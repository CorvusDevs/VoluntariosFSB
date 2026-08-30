Outcome: El CMS limita fotos, contactos y necesidades sensibles según finalidad, rol y equipo, con consentimiento y trazabilidad.
Scope: API de Cloudflare, D1, modelo de roster, interfaz de Personas y pruebas asociadas.
Excluded: Cloudflare Access, canales externos, cambios a GitHub o eliminación retrospectiva de datos.
Authority: Ediciones locales y migraciones D1 preparadas. El despliegue requiere la autorización vigente solo para Cloudflare.
Evidence: Pruebas de autorización, consentimiento, reducción de datos y registro de acceso, más revisión del flujo renderizado.
Stop condition: No se publica hasta que las rutas protegidas devuelvan los datos mínimos correctos para cada perfil.
Tool route: inspección de API y esquema, migración mínima, pruebas Vitest y prueba visual local.
Model effort: Terra medium.
Risks: Evitar romper las cuentas existentes y preservar perfiles ya cargados.
First checkpoint: Definir permisos de datos a partir del perfil actual y del equipo asignado.
