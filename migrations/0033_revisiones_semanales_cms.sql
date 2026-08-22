-- Deja constancia de la revisión semanal de Dirección sin duplicar tareas.
CREATE TABLE IF NOT EXISTS revisiones_semanales_cms (
  id TEXT PRIMARY KEY,
  semana_inicio TEXT NOT NULL UNIQUE,
  nota TEXT NOT NULL DEFAULT '',
  revisado_por TEXT NOT NULL REFERENCES usuarios(correo),
  revisado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS revisiones_semanales_fecha ON revisiones_semanales_cms(semana_inicio DESC);
