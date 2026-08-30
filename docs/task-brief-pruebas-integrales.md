Outcome: Cada flujo del CMS y de Fútbol sin Barreras queda comprobado con datos de prueba, permisos y persistencia verificables.
Scope: Modelo, API Pages Functions, D1 local, R2 simulado, interfaz y migraciones de VoluntariosFSB.
Excluded: Publicación, migración remota de producción y cambios de datos reales.
Authority: Pruebas locales y correcciones seguras. Cualquier despliegue sigue requiriendo autorización expresa.
Evidence: Suite Vitest completa, pruebas de API con base efímera, pruebas de roles y consentimientos, build de Pages y revisión visual local.
Stop condition: No quedan fallos funcionales reproducibles en los flujos cubiertos ni regresiones en la suite.
Tool route: Inventario de pruebas, ejecución por capas, adición de casos faltantes, build y recorrido visual.
Model effort: Terra medium.
Risks: Mantener aislados los datos de prueba y no tocar D1 ni R2 remotos.
