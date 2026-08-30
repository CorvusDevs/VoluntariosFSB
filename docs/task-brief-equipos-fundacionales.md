Outcome: Los siete equipos fundacionales existen realmente, pueden recibir integrantes y el mapa usa sus identificadores estables.
Scope: Migracion D1, modelo/API CMS, mapa y formularios de equipos, pruebas, build y publicacion Cloudflare Pages.
Excluded: Cambios de perfiles, contenido de ejemplo y rediseños ajenos a la asignacion de equipos.
Authority: Editar el proyecto, migrar D1 de produccion y publicar en aletea.pages.dev, autorizado en este turno.
Evidence: Pruebas nuevas, suite completa, build, consulta D1 posterior y comprobacion del despliegue canonico.
Stop condition: Siete equipos activos en D1, todos asignables, sin duplicar Dpto. Familias, y version nueva servida en produccion.
Tool route: apply_patch, npm test/build, Wrangler D1 y Pages, curl de verificacion.
Model effort: Alto, por migracion de datos vivos y compatibilidad con datos existentes.
Risks: Duplicar Familias, romper referencias existentes o servir archivos cacheados.
First checkpoint: Definir IDs canonicos y una migracion idempotente que conserve el equipo existente.
