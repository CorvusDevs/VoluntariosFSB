-- Cada período de una rutina deja una constancia operativa. Si falla, conserva
-- la fecha pendiente y el equipo puede reintentarlo desde el CMS.
CREATE TABLE IF NOT EXISTS automatizaciones_ejecuciones_cms (
  id TEXT PRIMARY KEY,
  recurrencia_id TEXT NOT NULL REFERENCES tareas_recurrentes_cms(id),
  periodo TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('procesando', 'completada', 'fallida')),
  intentos INTEGER NOT NULL DEFAULT 1,
  error TEXT,
  tarea_id TEXT REFERENCES tareas_cms(id),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recurrencia_id, periodo)
);

CREATE INDEX IF NOT EXISTS automatizaciones_ejecuciones_estado_fecha
  ON automatizaciones_ejecuciones_cms(estado, actualizado_en DESC);
