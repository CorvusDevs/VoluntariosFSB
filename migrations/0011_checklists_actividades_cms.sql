-- Checklists reutilizables. Una plantilla se puede aplicar una sola vez a cada
-- actividad, para evitar duplicar por accidente las tareas de preparación.
CREATE TABLE IF NOT EXISTS plantillas_tareas_cms (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL DEFAULT '',
  equipo_id TEXT REFERENCES equipos(id),
  creado_por TEXT NOT NULL REFERENCES usuarios(correo),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plantilla_tareas_items_cms (
  id TEXT PRIMARY KEY,
  plantilla_id TEXT NOT NULL REFERENCES plantillas_tareas_cms(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  prioridad TEXT NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
  dias_antes INTEGER NOT NULL DEFAULT 0 CHECK (dias_antes BETWEEN 0 AND 365),
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS aplicaciones_plantilla_tareas_cms (
  id TEXT PRIMARY KEY,
  plantilla_id TEXT NOT NULL REFERENCES plantillas_tareas_cms(id),
  evento_id TEXT NOT NULL REFERENCES eventos_cms(id),
  aplicado_por TEXT NOT NULL REFERENCES usuarios(correo),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plantilla_id, evento_id)
);

CREATE INDEX IF NOT EXISTS plantilla_tareas_items_plantilla ON plantilla_tareas_items_cms(plantilla_id, orden);
CREATE INDEX IF NOT EXISTS aplicaciones_plantilla_evento ON aplicaciones_plantilla_tareas_cms(evento_id);
