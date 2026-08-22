-- Una agenda única distingue acciones, vencimientos y obligaciones institucionales.
ALTER TABLE eventos_cms ADD COLUMN tipo TEXT NOT NULL DEFAULT 'actividad'
  CHECK (tipo IN ('actividad', 'reunion', 'curso', 'publicacion', 'vencimiento', 'pago', 'renovacion', 'tramite', 'certificacion', 'asamblea'));

CREATE INDEX IF NOT EXISTS eventos_cms_tipo_fecha ON eventos_cms(tipo, estado, fecha_hora);
