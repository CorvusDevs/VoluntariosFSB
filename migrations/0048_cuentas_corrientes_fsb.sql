-- Cuentas corrientes privadas de Fútbol sin Barreras.
-- Los importes se guardan en centésimos para evitar errores de redondeo.
CREATE TABLE cuentas_fsb (
  id TEXT PRIMARY KEY,
  persona_id TEXT UNIQUE,
  nombre TEXT NOT NULL,
  grupo INTEGER CHECK (grupo IN (1, 2)),
  condicion TEXT NOT NULL DEFAULT 'regular' CHECK (condicion IN ('regular', 'beca', 'voluntariado', 'baja')),
  beca_porcentaje REAL NOT NULL DEFAULT 0 CHECK (beca_porcentaje >= 0 AND beca_porcentaje <= 100),
  observaciones TEXT NOT NULL DEFAULT '',
  activa INTEGER NOT NULL DEFAULT 1 CHECK (activa IN (0, 1)),
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE movimientos_fsb (
  id TEXT PRIMARY KEY,
  cuenta_id TEXT NOT NULL REFERENCES cuentas_fsb(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cargo', 'pago', 'recargo', 'ajuste_cargo', 'ajuste_credito', 'saldo_inicial')),
  concepto TEXT NOT NULL,
  periodo TEXT,
  fecha TEXT NOT NULL,
  vencimiento TEXT,
  importe_centavos INTEGER NOT NULL CHECK (importe_centavos != 0),
  medio_pago TEXT NOT NULL DEFAULT '',
  comprobante TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  clave_operacion TEXT UNIQUE,
  creado_por TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  anulado_en TEXT,
  anulado_por TEXT,
  motivo_anulacion TEXT NOT NULL DEFAULT ''
);

CREATE INDEX cuentas_fsb_estado ON cuentas_fsb(activa, grupo, nombre);
CREATE INDEX movimientos_fsb_cuenta_fecha ON movimientos_fsb(cuenta_id, fecha, creado_en);
CREATE INDEX movimientos_fsb_vencimiento ON movimientos_fsb(vencimiento, anulado_en);
