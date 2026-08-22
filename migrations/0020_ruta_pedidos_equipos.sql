-- Un pedido entre equipos conserva su origen y prioridad, además del equipo
-- que debe atenderlo. Esto permite que Dirección vea la ruta completa sin
-- convertir la bandeja en una memoria informal de mensajes.
ALTER TABLE entradas_cms ADD COLUMN equipo_solicitante_id TEXT REFERENCES equipos(id);
ALTER TABLE entradas_cms ADD COLUMN prioridad TEXT NOT NULL DEFAULT 'normal'
  CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente'));

ALTER TABLE formularios_cms ADD COLUMN equipo_solicitante_id TEXT REFERENCES equipos(id);
ALTER TABLE formularios_cms ADD COLUMN prioridad TEXT NOT NULL DEFAULT 'normal'
  CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente'));

CREATE INDEX IF NOT EXISTS entradas_cms_ruta_pedido
  ON entradas_cms(equipo_solicitante_id, equipo_id, prioridad, estado);
