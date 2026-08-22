-- Las actividades también necesitan un cierre posterior. El valor negativo
-- significa días después de la actividad y permite evaluación y rendición.
CREATE TABLE plantilla_tareas_items_cms_nueva (
  id TEXT PRIMARY KEY,
  plantilla_id TEXT NOT NULL REFERENCES plantillas_tareas_cms(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  prioridad TEXT NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
  dias_antes INTEGER NOT NULL DEFAULT 0 CHECK (dias_antes BETWEEN -365 AND 365),
  orden INTEGER NOT NULL DEFAULT 0
);

INSERT INTO plantilla_tareas_items_cms_nueva (id, plantilla_id, titulo, descripcion, prioridad, dias_antes, orden)
SELECT id, plantilla_id, titulo, descripcion, prioridad, dias_antes, orden
FROM plantilla_tareas_items_cms;

DROP TABLE plantilla_tareas_items_cms;
ALTER TABLE plantilla_tareas_items_cms_nueva RENAME TO plantilla_tareas_items_cms;
CREATE INDEX plantilla_tareas_items_plantilla ON plantilla_tareas_items_cms(plantilla_id, orden);
