-- Una propuesta de actividad o evento puede sugerir fecha, pero solo la
-- coordinación la convierte en una fecha de agenda.
ALTER TABLE entradas_cms ADD COLUMN fecha_propuesta TEXT;
ALTER TABLE entradas_cms ADD COLUMN evento_id TEXT REFERENCES eventos_cms(id);

CREATE INDEX IF NOT EXISTS entradas_cms_fecha_propuesta ON entradas_cms(fecha_propuesta, estado);
CREATE INDEX IF NOT EXISTS entradas_cms_evento ON entradas_cms(evento_id);
