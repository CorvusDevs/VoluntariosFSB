-- Actividades y eventos internos del CMS. No contiene datos personales de participantes.
CREATE TABLE IF NOT EXISTS eventos_cms (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  fecha_hora TEXT NOT NULL,
  fecha_fin TEXT,
  lugar TEXT NOT NULL DEFAULT '',
  equipo_id TEXT REFERENCES equipos(id),
  proyecto_id TEXT REFERENCES proyectos_cms(id),
  responsable_correo TEXT REFERENCES usuarios(correo),
  estado TEXT NOT NULL DEFAULT 'planificado' CHECK (estado IN ('planificado', 'realizado', 'cancelado')),
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS eventos_cms_fecha ON eventos_cms(estado, fecha_hora);
CREATE INDEX IF NOT EXISTS eventos_cms_contexto ON eventos_cms(equipo_id, proyecto_id, fecha_hora);
