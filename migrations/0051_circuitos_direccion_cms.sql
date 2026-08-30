-- Completa los circuitos de seguimiento, reuniones y formularios sin crear
-- módulos paralelos a las tareas, entradas y revisiones ya existentes.

ALTER TABLE tareas_cms ADD COLUMN seguimiento_personal INTEGER NOT NULL DEFAULT 0 CHECK (seguimiento_personal IN (0, 1));
ALTER TABLE tareas_cms ADD COLUMN motivo_seguimiento TEXT NOT NULL DEFAULT '';
ALTER TABLE tareas_cms ADD COLUMN seguimiento_personal_por TEXT REFERENCES usuarios(correo);

ALTER TABLE reuniones_cms ADD COLUMN cerrada_en TEXT;
ALTER TABLE reuniones_cms ADD COLUMN proxima_revision TEXT;

ALTER TABLE formularios_cms ADD COLUMN destino_respuesta VARCHAR(40) NOT NULL DEFAULT 'tarea'
  CHECK (destino_respuesta IN ('tarea', 'solicitud', 'actividad', 'alta_persona', 'contacto', 'archivo'));

ALTER TABLE entradas_cms ADD COLUMN destino_respuesta TEXT NOT NULL DEFAULT 'tarea';
ALTER TABLE entradas_cms ADD COLUMN revision_requerida INTEGER NOT NULL DEFAULT 0 CHECK (revision_requerida IN (0, 1));

CREATE INDEX IF NOT EXISTS tareas_cms_seguimiento_personal
  ON tareas_cms(seguimiento_personal_por, seguimiento_personal, estado, fecha_seguimiento);
