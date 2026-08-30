-- La vigencia sin vencimiento debe concederse de forma explicita.
-- Los permisos existentes conservan su comportamiento y no se amplian.
ALTER TABLE usuarios ADD COLUMN datos_personales_sin_vencimiento INTEGER NOT NULL DEFAULT 0
  CHECK (datos_personales_sin_vencimiento IN (0, 1));
