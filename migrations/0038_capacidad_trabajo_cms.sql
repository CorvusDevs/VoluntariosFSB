-- Disponibilidad semanal declarada y esfuerzo estimado. La sobrecarga solo se
-- calcula con horas explícitas para no convertir un conteo de tareas en una
-- estimación engañosa.
ALTER TABLE tareas_cms ADD COLUMN esfuerzo_horas REAL
  CHECK (esfuerzo_horas IS NULL OR (esfuerzo_horas > 0 AND esfuerzo_horas <= 168));

CREATE TABLE IF NOT EXISTS capacidad_trabajo_cms (
  usuario_correo TEXT PRIMARY KEY REFERENCES usuarios(correo) ON DELETE CASCADE,
  horas_semanales REAL NOT NULL CHECK (horas_semanales >= 0 AND horas_semanales <= 80),
  nota TEXT NOT NULL DEFAULT '',
  actualizado_por TEXT NOT NULL REFERENCES usuarios(correo),
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS capacidad_trabajo_actualizada
  ON capacidad_trabajo_cms(actualizado_en DESC);
