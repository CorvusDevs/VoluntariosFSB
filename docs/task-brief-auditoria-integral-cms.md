Outcome: El CMS completo funciona con formularios, datos, estados y navegación coherentes en escritorio y celular, con brechas priorizadas frente a CMS organizacionales actuales.
Scope: /Users/ale/Documents/VoluntariosFSB, interfaz institucional, flujos de ingreso, persistencia D1/local, permisos, pruebas y artefacto Cloudflare.
Excluded: cambios de credenciales, borrado de datos reales, cambios de roles y publicación sin una orden explícita en el turno correspondiente.
Authority: inspección y correcciones locales no destructivas; producción y datos reales requieren autorización explícita.
Evidence: inventario pantalla-campo-almacenamiento, pruebas automáticas, recorridos visuales en móvil/escritorio, comprobación de persistencia y revisión de permisos.
Stop condition: cada requisito queda probado o documentado como brecha concreta con impacto, evidencia y siguiente corrección.
Tool route: rg y pruebas para inventario, navegador para interacción real, fuentes primarias para comparación, apply_patch para cambios.
Model effort: alto, porque cruza producto, datos, seguridad, accesibilidad y responsive.
Risks: worktree muy modificado, sesión autenticada dependiente del entorno y datos personales en producción.
First checkpoint: mapa actual de pantallas, formularios, endpoints y cobertura antes de modificar comportamiento.
