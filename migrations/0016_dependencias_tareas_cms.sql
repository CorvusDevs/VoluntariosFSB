-- Una tarea puede esperar a otra sin duplicar su contexto ni sus responsables.
CREATE TABLE IF NOT EXISTS tareas_dependencias_cms (
  tarea_id TEXT NOT NULL REFERENCES tareas_cms(id) ON DELETE CASCADE,
  depende_de_id TEXT NOT NULL REFERENCES tareas_cms(id) ON DELETE CASCADE,
  creado_por TEXT NOT NULL REFERENCES usuarios(correo),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tarea_id, depende_de_id),
  CHECK (tarea_id != depende_de_id)
);

CREATE INDEX IF NOT EXISTS tareas_dependencias_predecesora ON tareas_dependencias_cms(depende_de_id);
