-- Perfiles institucionales. Conservamos `rol` por compatibilidad con las
-- cuentas existentes y usamos `perfil_acceso` para el alcance real del CMS.
-- La administración conserva el control global y Dirección suma visión
-- transversal sin habilitar por ello los datos personales del programa.
ALTER TABLE usuarios ADD COLUMN perfil_acceso TEXT NOT NULL DEFAULT 'coordinacion'
  CHECK (perfil_acceso IN ('administracion', 'direccion', 'coordinacion', 'integrante', 'consulta'));

UPDATE usuarios
SET perfil_acceso = CASE WHEN rol = 'admin' THEN 'administracion' ELSE 'coordinacion' END
WHERE perfil_acceso = 'coordinacion';

CREATE INDEX IF NOT EXISTS usuarios_perfil_acceso_activo
  ON usuarios(perfil_acceso, activo);
