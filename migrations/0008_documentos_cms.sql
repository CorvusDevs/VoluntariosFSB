-- Centro documental inicial. Guarda referencias y metadatos, no archivos ni datos sensibles.
CREATE TABLE IF NOT EXISTS documentos_cms (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'enlace' CHECK (tipo IN ('enlace', 'guia', 'acta', 'plantilla', 'politica')),
  url TEXT NOT NULL,
  sensibilidad TEXT NOT NULL DEFAULT 'interno' CHECK (sensibilidad IN ('compartido', 'interno', 'restringido')),
  equipo_id TEXT REFERENCES equipos(id),
  proyecto_id TEXT REFERENCES proyectos_cms(id),
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS documentos_cms_contexto ON documentos_cms(proyecto_id, equipo_id, actualizado_en);
