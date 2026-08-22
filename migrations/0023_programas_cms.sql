-- Programas institucionales independientes de Fútbol sin Barreras. Un
-- programa puede reunir proyectos y equipos sin volverlos una misma cosa.
CREATE TABLE IF NOT EXISTS programas_cms (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('borrador', 'activo', 'en_pausa', 'cerrado')),
  equipo_id TEXT REFERENCES equipos(id) ON DELETE SET NULL,
  creado_por TEXT NOT NULL REFERENCES usuarios(correo),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS programas_cms_equipo_estado
  ON programas_cms(equipo_id, estado);
