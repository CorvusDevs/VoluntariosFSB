Outcome: Todas las cartas membretadas muestran y exportan una hoja A4 blanca, cualquiera sea la combinacion de colores elegida.
Scope: Editor de comunicacion visual, renderizado de carta, exportacion y pruebas directamente relacionadas.
Excluded: Cambios en textos, membrete, paletas de marca, permisos y publicacion externa.
Authority: Ediciones y verificaciones locales. No publicar sin una instruccion posterior explicita.
Evidence: Causa identificada, pruebas automatizadas para todas las paletas, inspeccion visual y suite relevante aprobada.
Stop condition: Vista previa y exportacion conservan fondo blanco en todos los estilos sin regresiones visibles.
Tool route: rg, inspeccion de renderer y CSS, apply_patch, Vitest y fixture local.
Model effort: Terra medium.
Risks: Confundir el fondo del papel con elementos decorativos de color o con el fondo exterior del editor.
First checkpoint: Localizar el origen exacto del color aplicado al lienzo A4 antes de editar.
