-- Riesgos trazables por proyecto. Permite identificar, asignar y revisar
-- obstáculos sin mezclar información sensible de participantes.

CREATE TABLE IF NOT EXISTS proyecto_riesgos_cms (
  id TEXT PRIMARY KEY,
  proyecto_id TEXT NOT NULL REFERENCES proyectos_cms(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  nivel TEXT NOT NULL DEFAULT 'medio' CHECK (nivel IN ('bajo', 'medio', 'alto', 'critico')),
  estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'mitigado', 'aceptado')),
  responsable_correo TEXT REFERENCES usuarios(correo),
  fecha_revision TEXT,
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS proyecto_riesgos_cms_tablero
  ON proyecto_riesgos_cms(estado, nivel, fecha_revision);
CREATE INDEX IF NOT EXISTS proyecto_riesgos_cms_proyecto
  ON proyecto_riesgos_cms(proyecto_id, estado, actualizado_en);
