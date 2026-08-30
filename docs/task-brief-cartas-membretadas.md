Outcome: Crear cartas membretadas A4 personalizables dentro de Comunicación visual con vista previa fiel y salida imprimible.
Scope: Editor visual, modelo de documento, estilos, ayuda, cambios y pruebas asociadas.
Excluded: Cambios en aletea.org, publicación externa, edición colaborativa y firma digital certificada.
Authority: Ediciones locales y pruebas. Todo despliegue externo requiere autorización posterior.
Evidence: Pruebas del modelo y la UI, render visual en escritorio y móvil, impresión A4 sin recortes, auditoría de texto y diff.
Stop condition: La carta puede editarse visualmente, guardar un borrador y producir una salida A4 consistente sin romper el editor de piezas.
Tool route: rg, inspección focalizada, apply_patch, Vitest y navegador local.
Model effort: Medio.
Risks: Paginación de textos largos, proporciones del logo, fuentes disponibles y diferencias entre impresión y pantalla.
First checkpoint: Confirmar cómo se modelan, guardan y exportan las piezas actuales antes de elegir la integración.
