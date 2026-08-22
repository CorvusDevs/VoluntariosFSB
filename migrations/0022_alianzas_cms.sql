-- Alianzas institucionales sin datos personales de contacto. Vinculan el
-- trabajo en red con un equipo o proyecto sin convertir el CMS en una agenda.
CREATE TABLE IF NOT EXISTS alianzas_cms (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'aliado'
    CHECK (tipo IN ('aliado', 'patrocinador', 'institucion', 'proveedor', 'red')),
  descripcion TEXT NOT NULL DEFAULT '',
  contacto_institucional TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('activa', 'en_pausa', 'finalizada')),
  equipo_id TEXT REFERENCES equipos(id) ON DELETE SET NULL,
  proyecto_id TEXT REFERENCES proyectos_cms(id) ON DELETE SET NULL,
  creado_por TEXT NOT NULL REFERENCES usuarios(correo),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS alianzas_cms_equipo_estado
  ON alianzas_cms(equipo_id, estado);
CREATE INDEX IF NOT EXISTS alianzas_cms_proyecto_estado
  ON alianzas_cms(proyecto_id, estado);
