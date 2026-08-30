SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS compromisos_pago_fsb (
  id VARCHAR(191) PRIMARY KEY,
  cuenta_id VARCHAR(191) NOT NULL,
  importe_centavos INT,
  fecha_acuerdo DATE NOT NULL,
  fecha_prevista DATE NOT NULL,
  estado VARCHAR(191) NOT NULL DEFAULT 'vigente',
  nota LONGTEXT NOT NULL,
  creado_por VARCHAR(191) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cerrado_por VARCHAR(191),
  cerrado_en DATETIME,
  motivo_cierre LONGTEXT NOT NULL,
  CONSTRAINT compromisos_pago_fsb_cuenta FOREIGN KEY (cuenta_id) REFERENCES cuentas_fsb(id) ON DELETE CASCADE,
  INDEX compromisos_pago_fsb_cuenta_estado (cuenta_id, estado, fecha_prevista),
  CHECK (estado IN ('vigente', 'cumplido', 'cancelado')),
  CHECK (importe_centavos IS NULL OR importe_centavos > 0)
);

SET FOREIGN_KEY_CHECKS = 1;
