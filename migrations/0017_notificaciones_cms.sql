-- Notificaciones internas del CMS. Se mantienen dentro de la aplicación y no
-- activan correo, WhatsApp ni ningún otro canal externo.
CREATE TABLE IF NOT EXISTS notificaciones_cms (
  id TEXT PRIMARY KEY,
  usuario_correo TEXT NOT NULL REFERENCES usuarios(correo),
  tipo TEXT NOT NULL CHECK (tipo IN ('asignacion_tarea', 'solicitud_recibida')),
  tarea_id TEXT NOT NULL REFERENCES tareas_cms(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  detalle TEXT NOT NULL DEFAULT '',
  leida_en TEXT,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_correo, tipo, tarea_id)
);

CREATE INDEX IF NOT EXISTS notificaciones_cms_bandeja
  ON notificaciones_cms(usuario_correo, leida_en, creado_en DESC);
