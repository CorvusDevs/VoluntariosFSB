Outcome: Publicar el popout compacto ya auditado y luego asegurar ayudas contextuales útiles en los controles del gestor y la página.
Scope: VoluntariosFSB y work/aletea-web, paquete cPanel actual, componentes de botones y controles, pruebas, ayuda y reglas de validación.
Excluded: Cambiar permisos, datos institucionales o rediseñar módulos no relacionados.
Authority: Editar y probar localmente. Publicar ahora el paquete auditado de novedades en cPanel. No publicar la etapa posterior de tooltips sin una nueva indicación.
Evidence: Pruebas completas, auditoría del paquete, versión y hashes servidos en vivo, inventario de controles sin ayuda, pruebas de teclado y teléfono.
Stop condition: Publicación actual verificada y etapa de tooltips implementada y auditada localmente sin regresiones.
Tool route: Scripts existentes de sellado y cPanel, inspección programática del DOM, pruebas Vitest y captura responsive.
Model effort: Medio.
Risks: Worktree con cambios previos, tooltips redundantes, ayudas inaccesibles por teclado y confundir HTML público con controles del CMS.
First checkpoint: Confirmar exactamente qué archivos entran en el paquete actual y cómo se verificó la publicación anterior.
