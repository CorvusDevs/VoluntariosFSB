-- Convierte el cierre de una respuesta en un cumplimiento explicable.
-- Los datos resumidos permiten filtrar el historial sin leer la auditoría.
ALTER TABLE entradas_cms ADD COLUMN cumplida_en TEXT;
ALTER TABLE entradas_cms ADD COLUMN cumplida_por TEXT REFERENCES usuarios(correo);
ALTER TABLE entradas_cms ADD COLUMN cumplida_medio TEXT NOT NULL DEFAULT '';
ALTER TABLE entradas_cms ADD COLUMN cumplida_motivo TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS historial_entradas_cms (
  id TEXT PRIMARY KEY,
  entrada_id TEXT NOT NULL REFERENCES entradas_cms(id),
  accion TEXT NOT NULL CHECK (accion IN ('cumplida', 'reabierta')),
  fecha TEXT NOT NULL,
  medio TEXT NOT NULL DEFAULT '',
  motivo TEXT NOT NULL,
  actor_correo TEXT NOT NULL REFERENCES usuarios(correo),
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS entradas_cms_cumplidas
  ON entradas_cms(estado, cumplida_en DESC);

CREATE INDEX IF NOT EXISTS historial_entradas_cms_entrada
  ON historial_entradas_cms(entrada_id, creado_en DESC);
