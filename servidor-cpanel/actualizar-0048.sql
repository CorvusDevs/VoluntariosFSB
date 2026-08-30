SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS cuentas_fsb (
  id VARCHAR(191) PRIMARY KEY,
  persona_id VARCHAR(191) UNIQUE,
  nombre VARCHAR(191) NOT NULL,
  grupo INT,
  condicion VARCHAR(191) NOT NULL DEFAULT 'regular',
  beca_porcentaje DECIMAL(12,2) NOT NULL DEFAULT 0,
  observaciones LONGTEXT NOT NULL,
  activa INT NOT NULL DEFAULT 1,
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX cuentas_fsb_estado (activa, grupo, nombre),
  CHECK (grupo IS NULL OR grupo IN (1, 2)),
  CHECK (condicion IN ('regular', 'beca', 'voluntariado', 'baja')),
  CHECK (beca_porcentaje >= 0 AND beca_porcentaje <= 100),
  CHECK (activa IN (0, 1))
);

CREATE TABLE IF NOT EXISTS movimientos_fsb (
  id VARCHAR(191) PRIMARY KEY,
  cuenta_id VARCHAR(191) NOT NULL,
  tipo VARCHAR(191) NOT NULL,
  concepto VARCHAR(191) NOT NULL,
  periodo VARCHAR(191),
  fecha DATE NOT NULL,
  vencimiento DATE,
  importe_centavos INT NOT NULL,
  medio_pago VARCHAR(191) NOT NULL DEFAULT '',
  comprobante VARCHAR(191) NOT NULL DEFAULT '',
  notas LONGTEXT NOT NULL,
  clave_operacion VARCHAR(191) UNIQUE,
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  anulado_en DATETIME,
  anulado_por VARCHAR(191),
  motivo_anulacion LONGTEXT NOT NULL,
  CONSTRAINT movimientos_fsb_cuenta FOREIGN KEY (cuenta_id) REFERENCES cuentas_fsb(id) ON DELETE CASCADE,
  INDEX movimientos_fsb_cuenta_fecha (cuenta_id, fecha, creado_en),
  INDEX movimientos_fsb_vencimiento (vencimiento, anulado_en),
  CHECK (tipo IN ('cargo', 'pago', 'recargo', 'ajuste_cargo', 'ajuste_credito', 'saldo_inicial')),
  CHECK (importe_centavos != 0)
);

SET FOREIGN_KEY_CHECKS = 1;
