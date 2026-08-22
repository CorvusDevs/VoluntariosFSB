-- Solo registra el último inicio correcto. Sirve para detectar cuentas nunca
-- usadas o abandonadas sin guardar historial de navegación.
ALTER TABLE usuarios ADD COLUMN ultimo_acceso TEXT;
