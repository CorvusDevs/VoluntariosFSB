-- Una actividad puede tener tareas operativas sin duplicar el seguimiento.
ALTER TABLE tareas_cms ADD COLUMN evento_id TEXT REFERENCES eventos_cms(id);

CREATE INDEX IF NOT EXISTS tareas_cms_evento ON tareas_cms(evento_id, estado);
