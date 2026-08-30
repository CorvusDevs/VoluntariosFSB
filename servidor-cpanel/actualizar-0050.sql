SET NAMES utf8mb4;

ALTER TABLE usuarios
  ADD COLUMN datos_personales_sin_vencimiento TINYINT NOT NULL DEFAULT 0
  CHECK (datos_personales_sin_vencimiento IN (0, 1));
