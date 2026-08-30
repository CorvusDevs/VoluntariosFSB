Outcome: Administración puede asignar y quitar equipos de un usuario desde Accesos, y agregar o quitar usuarios desde la interfaz de cada equipo.
Scope: VoluntariosFSB, API D1, pantalla de Accesos, pantalla CMS de equipos, estilos y pruebas asociadas.
Excluded: credenciales, perfiles de acceso, permisos, datos personales, personas sin cuenta y publicación.
Authority: editar y validar localmente; cualquier migración remota o despliegue requiere autorización posterior.
Evidence: pruebas API y UI, suite completa, build Cloudflare, escritorio y 390x844 sin overflow ni controles inaccesibles.
Stop condition: ambos flujos persisten la misma relación y reflejan el cambio al volver a abrir cualquiera de las dos pantallas.
Tool route: rg, inspección dirigida, apply_patch, Vitest, build y navegador local.
Model effort: medio.
Risks: quitar el último equipo a perfiles que requieren uno, asignar usuarios inactivos y exponer equipos fuera del alcance administrativo.
First checkpoint: confirmar esquema, rutas existentes y forma de cargar usuarios/equipos antes de diseñar controles.
