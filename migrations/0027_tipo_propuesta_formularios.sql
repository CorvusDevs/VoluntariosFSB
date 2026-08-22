-- SQLite no permite ampliar un CHECK existente: se reconstruye la tabla sin
-- perder formularios, prioridades ni equipos ya configurados.
PRAGMA foreign_keys = OFF;

CREATE TABLE formularios_cms_nuevo (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL CHECK (tipo IN ('voluntariado', 'inscripcion', 'actividad', 'evento', 'pedido', 'propuesta')),
  visibilidad TEXT NOT NULL DEFAULT 'interna' CHECK (visibilidad IN ('interna', 'publica')),
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'cerrada')),
  equipo_id TEXT REFERENCES equipos(id),
  proyecto_id TEXT REFERENCES proyectos_cms(id),
  creado_por TEXT NOT NULL REFERENCES usuarios(correo),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  equipo_solicitante_id TEXT REFERENCES equipos(id),
  prioridad TEXT NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente'))
);

INSERT INTO formularios_cms_nuevo
  SELECT id, titulo, descripcion, tipo, visibilidad, estado, equipo_id, proyecto_id, creado_por, creado_en, actualizado_en, equipo_solicitante_id, prioridad
  FROM formularios_cms;

DROP TABLE formularios_cms;
ALTER TABLE formularios_cms_nuevo RENAME TO formularios_cms;
CREATE INDEX IF NOT EXISTS formularios_cms_visibilidad ON formularios_cms(visibilidad, estado, actualizado_en DESC);
PRAGMA foreign_keys = ON;
