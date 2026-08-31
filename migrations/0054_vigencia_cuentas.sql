ALTER TABLE usuarios ADD COLUMN acceso_hasta TEXT;

CREATE INDEX IF NOT EXISTS usuarios_acceso_hasta_activo
  ON usuarios (activo, acceso_hasta);
