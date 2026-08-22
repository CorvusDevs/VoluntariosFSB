-- Tablón institucional interno. Un comunicado puede dirigirse a toda Aletea
-- o a un equipo, sin depender de canales externos para conservar el contexto.
CREATE TABLE comunicados_cms (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  detalle TEXT NOT NULL DEFAULT '',
  prioridad TEXT NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('normal', 'urgente')),
  equipo_id TEXT REFERENCES equipos(id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado')),
  vence_el TEXT,
  creado_por TEXT NOT NULL REFERENCES usuarios(correo),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX comunicados_cms_visibilidad ON comunicados_cms(estado, equipo_id, creado_en DESC);
