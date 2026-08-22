-- Un proyecto puede pertenecer a un programa institucional sin perder su
-- equipo responsable ni su cronograma propio.
ALTER TABLE proyectos_cms ADD COLUMN programa_id TEXT REFERENCES programas_cms(id);

CREATE INDEX IF NOT EXISTS proyectos_cms_programa_estado
  ON proyectos_cms(programa_id, estado);
