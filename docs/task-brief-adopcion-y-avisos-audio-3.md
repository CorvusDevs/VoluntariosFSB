Outcome: El gestor reemplaza avisos cotidianos de WhatsApp con una bandeja visible, destinos exactos, resumen personal y una alternativa manual copiable.
Scope: VoluntariosFSB, centro de control, Mi trabajo, notificaciones, tareas, Ayuda, cambios, API y pruebas relacionadas.
Excluded: Envíos automáticos por WhatsApp, Telegram, correo o push; proveedores pagos; publicación sin una orden posterior.
Authority: Editar y probar localmente. No desplegar ni modificar servicios externos.
Evidence: Pruebas de API y UI, rutas exactas, estados leídos, texto copiable, móvil, compilación Cloudflare y auditoría de texto.
Stop condition: Cada mejora prioritaria del audio tiene una superficie funcional o una explicación comprobable y no quedan regresiones en la suite.
Tool route: Inspección focalizada con rg, plan por fases, apply_patch, Vitest por fase, suite completa y compilación final.
Model effort: Alto, porque cruza persistencia, navegación, UI móvil, accesibilidad y adopción.
Risks: Duplicar avisos existentes, exponer datos en textos copiados, contadores desactualizados y rutas sin permisos.
First checkpoint: Inventariar la implementación actual y convertir las recomendaciones en fases sin duplicar funciones existentes.
