-- Compromisos privados de pago para Fútbol sin Barreras.
-- No generan cargos ni modifican saldos: registran un acuerdo de seguimiento.
CREATE TABLE compromisos_pago_fsb (
  id TEXT PRIMARY KEY,
  cuenta_id TEXT NOT NULL REFERENCES cuentas_fsb(id) ON DELETE CASCADE,
  importe_centavos INTEGER,
  fecha_acuerdo TEXT NOT NULL,
  fecha_prevista TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'cumplido', 'cancelado')),
  nota TEXT NOT NULL DEFAULT '',
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cerrado_por TEXT,
  cerrado_en TEXT,
  motivo_cierre TEXT NOT NULL DEFAULT '',
  CHECK (importe_centavos IS NULL OR importe_centavos > 0)
);

CREATE INDEX compromisos_pago_fsb_cuenta ON compromisos_pago_fsb(cuenta_id, estado, fecha_prevista);
