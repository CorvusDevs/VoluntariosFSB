CREATE TABLE IF NOT EXISTS alertas_pospuestas_cms (
  id TEXT PRIMARY KEY,
  usuario_correo TEXT NOT NULL REFERENCES usuarios(correo),
  clave TEXT NOT NULL,
  postergada_hasta TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_correo, clave)
);

CREATE INDEX IF NOT EXISTS alertas_pospuestas_usuario_fecha
  ON alertas_pospuestas_cms(usuario_correo, postergada_hasta);
