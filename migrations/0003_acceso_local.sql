-- Las cuentas viven en D1. La contrasena nunca se guarda: solo su derivado
-- PBKDF2 junto a una sal aleatoria, y una version para revocar sesiones.
ALTER TABLE usuarios ADD COLUMN sal BLOB;
ALTER TABLE usuarios ADD COLUMN hash_contrasena BLOB;
ALTER TABLE usuarios ADD COLUMN version_sesion INTEGER NOT NULL DEFAULT 0;
