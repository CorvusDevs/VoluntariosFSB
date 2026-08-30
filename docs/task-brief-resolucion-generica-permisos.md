Outcome: Cada bloqueo por permisos explica qué falta y permite resolver o solicitar cada requisito sin buscar pantallas manualmente.
Scope: VoluntariosFSB, contrato reutilizable de requisitos, navegación contextual, Accesos, Finanzas como primer consumidor, Ayuda, Cambios y pruebas.
Excluded: Conceder permisos automáticamente sin confirmación, cambiar datos reales, alterar roles existentes o publicar otros sitios.
Authority: Editar, probar, auditar y publicar gestor.aletea.org. No hacer commit ni push.
Evidence: Pruebas del contrato genérico, administración y usuarios comunes; flujo contextual verificado; suite completa; hashes y rutas en vivo.
Stop condition: La solución funciona sin nombres ni lógica exclusiva de Finanzas en el componente reutilizable y no expone datos protegidos.
Tool route: Inspección acotada, apply_patch, Vitest, vista local, paquete cPanel y verificación HTTPS.
Model effort: Terra medium.
Risks: Autoasignación sensible, escalada de privilegios, navegación sin contexto, cambios no auditados y caché de versión.
First checkpoint: Inventario de todos los bloqueos y del contrato mínimo compartido antes de editar.
