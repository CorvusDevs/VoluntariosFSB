Outcome: Administración registra y sigue solicitudes de copia o eliminación con identidad verificada, revisión y constancia de cierre.
Scope: Migración D1, API CMS, nueva pantalla administrativa, navegación, estilos y pruebas locales.
Excluded: Borrado automático, exportación masiva sin revisión, asesoramiento jurídico, publicación y cambios en producción.
Authority: Ediciones y validación locales. El despliegue y cualquier eliminación real requieren autorización posterior.
Evidence: Transiciones válidas, acceso sensible temporal obligatorio, historial sin nombres cuando vence el acceso, interfaz visual y suite completa.
Stop condition: El gestor permite documentar el proceso completo sin ejecutar una eliminación ni afirmar que produjo una exportación automática.
Tool route: Inspección focalizada, apply_patch, Vitest, compilación Cloudflare y auditoría estática.
Model effort: Alto, por privacidad, trazabilidad y UX administrativa.
Risks: Cerrar una solicitud sin constancia, exponer identidad en el historial o confundir seguimiento con ejecución automática.
First checkpoint: Crear el registro mínimo y probar que ninguna transición salta la verificación de identidad.
