Outcome: Cada función nueva del gestor queda visible y operable solo para los perfiles autorizados, con controles especiales para datos privados de cartas y formularios.
Scope: Menú, autorización de pantallas, API, almacenamiento y exportaciones de Página web, Comunicación visual, cartas membretadas, privacidad, métricas y accesos recientes. Se excluyen despliegues y cambios en aletea.org.
Authority: Se permiten auditoría, ediciones locales y pruebas. Publicar en gestor.aletea.org o prueba.aletea.org requiere autorización posterior.
Evidence: Matriz función por perfil, pruebas negativas de acceso, comprobación de rutas API, suite completa, diff y auditoría de texto.
Stop condition: Ninguna función sensible depende solo de ocultar el menú, y los perfiles sin permiso reciben una denegación verificable en UI y backend.
Tool route: rg, inspección focalizada, apply_patch, Vitest y verificación local.
Model effort: Medio.
