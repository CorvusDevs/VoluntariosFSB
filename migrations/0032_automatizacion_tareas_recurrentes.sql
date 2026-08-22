-- Las instancias creadas por una rutina tienen una referencia y un período
-- único. Así una ejecución programada repetida nunca duplica una tarea.
ALTER TABLE tareas_cms ADD COLUMN recurrencia_id TEXT REFERENCES tareas_recurrentes_cms(id);
ALTER TABLE tareas_cms ADD COLUMN generada_para TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS tareas_cms_recurrencia_periodo_unico
  ON tareas_cms(recurrencia_id, generada_para)
  WHERE recurrencia_id IS NOT NULL AND generada_para IS NOT NULL;

CREATE INDEX IF NOT EXISTS tareas_cms_recurrencia
  ON tareas_cms(recurrencia_id, generada_para);
